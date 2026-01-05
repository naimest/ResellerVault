import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  setDoc, 
  getDoc,
  FirestoreError
} from 'firebase/firestore';
import { Account, AccountType, Slot, Customer, TelegramConfig } from '../types';

const ACCOUNTS_COLL = 'accounts';
const CUSTOMERS_COLL = 'customers';
const SETTINGS_COLL = 'settings';
const SETTINGS_DOC = 'telegram';

// --- ACCOUNTS ---

export const subscribeToAccounts = (
  callback: (accounts: Account[]) => void,
  onError?: (error: FirestoreError) => void
) => {
  return onSnapshot(
    collection(db, ACCOUNTS_COLL), 
    (snapshot) => {
      const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      callback(accounts);
    },
    (error) => {
      if (onError) onError(error);
      else console.error("Accounts Listener Error:", error);
    }
  );
};

export const saveAccount = async (accountData: Partial<Account>): Promise<void> => {
  // Initialize slots
  let slots: Slot[] = [];
  if (accountData.type === AccountType.SHARED) {
    for (let i = 0; i < (accountData.maxSlots || 1); i++) {
      slots.push({
        id: Math.random().toString(36).substr(2, 9),
        customerId: null,
        customerName: '',
        isOccupied: false
      });
    }
  } else {
    slots.push({
      id: Math.random().toString(36).substr(2, 9),
      customerId: null,
      customerName: '',
      isOccupied: false
    });
  }

  const newAccount: Omit<Account, 'id'> = {
    createdAt: Date.now(),
    serviceName: accountData.serviceName || 'Other',
    email: accountData.email || '',
    password: accountData.password || '',
    expirationDate: accountData.expirationDate || '',
    type: accountData.type || AccountType.PRIVATE,
    maxSlots: accountData.maxSlots || 1,
    slots: slots,
  };

  await addDoc(collection(db, ACCOUNTS_COLL), newAccount);
};

export const updateAccount = async (account: Account): Promise<void> => {
  const accountRef = doc(db, ACCOUNTS_COLL, account.id);
  const { id, ...data } = account;
  await updateDoc(accountRef, data);
};

export const deleteAccount = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, ACCOUNTS_COLL, id));
};

export const updateSlot = async (accountId: string, slotId: string, customerId: string | null, customerName: string): Promise<void> => {
  const accountRef = doc(db, ACCOUNTS_COLL, accountId);
  const snapshot = await getDoc(accountRef);
  
  if (snapshot.exists()) {
    const account = snapshot.data() as Account;
    const updatedSlots = account.slots.map(slot => {
      if (slot.id === slotId) {
        return { ...slot, customerId, customerName, isOccupied: !!customerName };
      }
      return slot;
    });
    
    await updateDoc(accountRef, { slots: updatedSlots });
  }
};

// --- CUSTOMERS ---

export const subscribeToCustomers = (
  callback: (customers: Customer[]) => void,
  onError?: (error: FirestoreError) => void
) => {
  return onSnapshot(
    collection(db, CUSTOMERS_COLL), 
    (snapshot) => {
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      callback(customers);
    },
    (error) => {
      if (onError) onError(error);
      else console.error("Customers Listener Error:", error);
    }
  );
};

export const saveCustomer = async (customer: Omit<Customer, 'id'>): Promise<void> => {
  await addDoc(collection(db, CUSTOMERS_COLL), customer);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, CUSTOMERS_COLL, id));
};

// --- TELEGRAM ---

const DEFAULT_TELEGRAM: TelegramConfig = {
  botToken: '',
  chatId: '',
  intervalValue: 24,
  intervalUnit: 'hours',
  enabled: false
};

export const subscribeToTelegramConfig = (
  callback: (config: TelegramConfig) => void,
  onError?: (error: FirestoreError) => void
) => {
  return onSnapshot(
    doc(db, SETTINGS_COLL, SETTINGS_DOC), 
    (doc) => {
      if (doc.exists()) {
        callback({ ...DEFAULT_TELEGRAM, ...doc.data() } as TelegramConfig);
      } else {
        callback(DEFAULT_TELEGRAM);
      }
    },
    (error) => {
      if (onError) onError(error);
      else console.error("Telegram Config Listener Error:", error);
    }
  );
};

export const saveTelegramConfig = async (config: TelegramConfig): Promise<void> => {
  await setDoc(doc(db, SETTINGS_COLL, SETTINGS_DOC), config);
};
