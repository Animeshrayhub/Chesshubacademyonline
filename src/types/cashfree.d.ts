/**
 * ChessHub Academy - Cashfree Payment Gateway & Entitlement Type Definitions
 *
 * Security & Data Integrity Notes:
 * - External webhook payloads and API responses must be treated as UNTRUSTED runtime data.
 * - TypeScript types do not validate incoming JSON payloads at runtime; always verify signatures
 *   and validate required fields before consumption.
 */

import type { PackageId } from '@/constants/PRICING';

// ---------------------------------------------------------------------------
// 1. Gateway Statuses & Orders
// ---------------------------------------------------------------------------

export type PaymentOrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FLAGGED';

export type PaymentGatewayStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING'
  | 'USER_DROPPED'
  | 'CANCELLED';

export type CashfreeEnvironment = 'SANDBOX' | 'PRODUCTION';

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone: string;
}

export interface CashfreeOrderMeta {
  return_url?: string;
  notify_url?: string;
  payment_methods?: string;
}

export interface CashfreeCreateOrderRequest {
  order_id: string;
  order_amount: number;
  order_currency: 'INR' | 'USD';
  customer_details: CashfreeCustomerDetails;
  order_meta?: CashfreeOrderMeta;
  order_note?: string;
  order_tags?: Record<string, string>;
}

export interface CashfreeOrderResponse {
  cf_order_id?: string;
  order_id: string;
  entity?: string;
  order_currency: string;
  order_amount: number;
  order_status: string;
  payment_session_id: string;
  order_expiry_time?: string;
  order_note?: string;
  customer_details?: CashfreeCustomerDetails;
  order_meta?: CashfreeOrderMeta;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// 2. Database Records (Mirroring Supabase SQL Schema)
// ---------------------------------------------------------------------------

export interface PaymentOrderRecord {
  id: string;
  order_id: string;
  user_id: string;
  student_profile_id: string;
  package_id: PackageId;
  package_name: string;
  session_count: number;
  order_amount: number; // Stored in integer INR
  order_currency: 'INR';
  payment_session_id: string | null;
  order_status: PaymentOrderStatus;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransactionRecord {
  id: string;
  order_id: string;
  cf_payment_id: string;
  payment_status: string;
  payment_amount: number;
  payment_currency: string;
  payment_method?: Record<string, unknown> | null;
  bank_reference?: string | null;
  payment_time?: string | null;
  raw_payload?: Record<string, unknown> | null;
  created_at: string;
}

export type SessionEntitlementStatus =
  | 'ACTIVE'
  | 'DEPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface StudentSessionEntitlementRecord {
  id: string;
  student_id: string;
  order_id: string;
  package_id: string;
  package_name: string;
  sessions_purchased: number;
  sessions_remaining: number;
  status: SessionEntitlementStatus;
  granted_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// 3. Webhook Payloads (Untrusted External Input)
// ---------------------------------------------------------------------------

export interface CashfreeWebhookHeaders {
  'x-webhook-signature': string;
  'x-webhook-timestamp': string;
}

export interface CashfreeWebhookOrderData {
  order_id?: string;
  order_amount?: number;
  order_currency?: string;
  order_tags?: Record<string, string>;
}

export interface CashfreeWebhookPaymentData {
  cf_payment_id?: string | number;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_message?: string;
  payment_time?: string;
  bank_reference?: string;
  payment_method?: Record<string, unknown>;
  payment_group?: string;
}

export interface CashfreeWebhookCustomerData {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface CashfreePaymentSuccessWebhookPayload {
  type: 'PAYMENT_SUCCESS_WEBHOOK' | string;
  event_time?: string;
  data?: {
    order?: CashfreeWebhookOrderData;
    payment?: CashfreeWebhookPaymentData;
    customer_details?: CashfreeWebhookCustomerData;
  };
}

export type UntrustedCashfreeWebhookPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// 4. API Request & Response Contracts
// ---------------------------------------------------------------------------

export interface CreateOrderRequestBody {
  packageId: PackageId;
}

export interface CreateOrderResponseBody {
  success: boolean;
  orderId?: string;
  paymentSessionId?: string;
  amount?: number;
  currency?: string;
  packageName?: string;
  sessions?: number;
  error?: string;
}

export interface VerifyOrderRequestBody {
  orderId: string;
}

export interface VerifyOrderResponseBody {
  success: boolean;
  orderId?: string;
  orderStatus?: PaymentOrderStatus;
  sessionsGranted?: number;
  alreadyGranted?: boolean;
  error?: string;
}

export interface SessionBalanceResponseBody {
  success: boolean;
  totalPurchased?: number;
  totalRemaining?: number;
  activePackagesCount?: number;
  entitlements?: StudentSessionEntitlementRecord[];
  error?: string;
}
