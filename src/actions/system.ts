'use server';

import { revalidatePath } from 'next/cache';
import { getSystemConfig, saveSystemConfig } from '@/utils/systemConfig';

export async function getMaintenanceModeAction() {
  try {
    const config = await getSystemConfig();
    return {
      success: true,
      enabled: config.MAINTENANCE_MODE === 'true',
    };
  } catch (error: any) {
    return {
      success: false,
      enabled: false,
      error: error.message || 'Failed to fetch maintenance mode state',
    };
  }
}

export async function setMaintenanceModeAction(enabled: boolean) {
  try {
    const res = await saveSystemConfig({
      MAINTENANCE_MODE: enabled ? 'true' : 'false',
    });

    if (res.success) {
      revalidatePath('/dashboard/admin/settings/system');
      revalidatePath('/maintenance');
      revalidatePath('/dashboard');
    }

    return {
      success: res.success,
      enabled,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update maintenance mode state',
    };
  }
}
