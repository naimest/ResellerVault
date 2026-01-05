import { ServiceName } from './types';

// Default slot configurations for services
export const SERVICE_DEFAULTS: Record<string, { defaultSlots: number; color: string }> = {
  [ServiceName.NETFLIX]: { defaultSlots: 5, color: 'text-red-500' },
  [ServiceName.SPOTIFY]: { defaultSlots: 6, color: 'text-green-500' },
  [ServiceName.DISNEY_PLUS]: { defaultSlots: 4, color: 'text-blue-500' },
  [ServiceName.PRIME_VIDEO]: { defaultSlots: 3, color: 'text-blue-400' },
  [ServiceName.YOUTUBE_PREMIUM]: { defaultSlots: 5, color: 'text-red-600' },
  [ServiceName.VPN]: { defaultSlots: 5, color: 'text-orange-500' },
  [ServiceName.OTHER]: { defaultSlots: 1, color: 'text-gray-400' },
};

export const STORAGE_KEYS = {
  ACCOUNTS: 'resellervault_accounts',
  CUSTOMERS: 'resellervault_customers',
  TELEGRAM_CONFIG: 'resellervault_telegram_config',
  ADMIN_SESSION: 'resellervault_admin_session',
};
