// Data Models matching Firestore Schema

export enum AccountType {
  PRIVATE = 'PRIVATE',
  SHARED = 'SHARED',
}

export enum ServiceName {
  NETFLIX = 'Netflix',
  SPOTIFY = 'Spotify',
  DISNEY_PLUS = 'Disney+',
  PRIME_VIDEO = 'Prime Video',
  YOUTUBE_PREMIUM = 'YouTube Premium',
  VPN = 'VPN Service',
  ANGHAMI = 'Anghami',
  OTHER = 'Other'
}

export interface Customer {
  id: string;
  name: string;
  contact: string; // Email or Phone
  notes?: string;
}

export interface Slot {
  id: string;
  customerId: string | null; // Link to Customer ID
  customerName: string; // Fallback or display name
  isOccupied: boolean;
  notes?: string;
  expirationDate?: string; // Expiration date for this specific slot assignment
  profileName?: string; // Optional: The specific profile used (e.g., "Kids", "Profile 1")
}

export interface Account {
  id: string;
  serviceName: string; // Changed from Enum to string to support Custom Services
  email: string;
  password: string;
  expirationDate: string; // ISO String YYYY-MM-DD
  type: AccountType;
  maxSlots: number; // 1 for Private, N for Shared
  slots: Slot[];
  createdAt: number;
}

export interface DashboardStats {
  totalActive: number;
  expiringSoon: number; // < 3 days
  emptySlots: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  intervalValue: number;
  intervalUnit: 'minutes' | 'hours' | 'days';
  enabled: boolean;
}
