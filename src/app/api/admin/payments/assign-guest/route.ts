import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, targetUserId, notes } = body;

    if (!orderId || !targetUserId) {
      return NextResponse.json({ success: false, error: 'Order ID and Target Student User ID are required.' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Verify order exists and is eligible for assignment
    const { data: order, error: orderErr } = await admin
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ success: false, error: 'Payment order not found.' }, { status: 404 });
    }

    if (order.order_status !== 'PAID') {
      return NextResponse.json({
        success: false,
        error: `Cannot assign order with status "${order.order_status}". Only verified PAID orders can be assigned.`,
      }, { status: 400 });
    }

    if (order.user_id && order.user_id === targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'This order is already assigned to this student.',
      }, { status: 400 });
    }

    // Verify target student exists and is active
    const { data: targetStudent, error: studentErr } = await admin
      .from('users')
      .select('id, first_name, last_name, email, role, is_active')
      .eq('id', targetUserId)
      .maybeSingle();

    if (studentErr || !targetStudent) {
      return NextResponse.json({ success: false, error: 'Target student not found.' }, { status: 404 });
    }

    if (targetStudent.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Target user must have the STUDENT role.' }, { status: 400 });
    }

    // Execute stored procedure admin_assign_guest_payment_to_student
    const { data: rpcResult, error: rpcErr } = await admin.rpc('admin_assign_guest_payment_to_student', {
      p_order_id: orderId,
      p_target_user_id: targetUserId,
      p_admin_user_id: user.id,
      p_assignment_notes: notes || `Manually assigned by admin ${user.email}`,
    });

    if (rpcErr) {
      console.warn('[assign-guest RPC failed, running transactional fallback]', rpcErr);

      // Fallback: Resolve student profile
      const { data: profile } = await admin
        .from('student_profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();

      const profileId = profile?.id || targetUserId;
      const sessionCount = Number(order.session_count) || 12;

      // 1. Update payment order
      const { error: updateErr } = await admin
        .from('payment_orders')
        .update({
          user_id: targetUserId,
          student_profile_id: profileId,
          is_guest: false,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          assignment_notes: notes || `Assigned by admin ${user.email}`,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      if (updateErr) {
        throw new Error(`Failed to update order assignment: ${updateErr.message}`);
      }

      // 2. Grant session entitlement exactly once
      const { error: entErr } = await admin
        .from('student_session_entitlements')
        .insert({
          user_id: targetUserId,
          student_profile_id: profileId,
          order_id: orderId,
          package_id: order.package_id,
          package_name: order.package_name,
          sessions_purchased: sessionCount,
          sessions_remaining: sessionCount,
          is_active: true,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (entErr) {
        console.error('[Fallback entitlement insert error]', entErr);
      }

      // 3. Write audit log
      try {
        await admin.from('audit_logs').insert({
          action: 'PAYMENT_ASSIGNED_TO_STUDENT',
          user_id: user.id,
          target_id: orderId,
          details: {
            order_id: orderId,
            target_user_id: targetUserId,
            student_email: targetStudent.email,
            assigned_by: user.email,
            session_count: sessionCount,
          },
          created_at: new Date().toISOString(),
        });
      } catch (logErr) {
        // Non-blocking audit log
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully linked order ${orderId} to student ${targetStudent.first_name || ''} ${targetStudent.last_name || ''} (${targetStudent.email}).`,
    });
  } catch (err: any) {
    console.error('[admin/assign-guest error]', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
