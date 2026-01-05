import { Account, AccountType, Slot, ServiceName, Customer, TelegramConfig } from '../types';
import { STORAGE_KEYS, SERVICE_DEFAULTS } from '../constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- ACCOUNTS ---

export const getAccounts = (): Account[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  return data ? JSON.parse(data) : [];
};

export const saveAccount = (accountData: Partial<Account>): Account => {
  const accounts = getAccounts();
  
  // Logic to initialize slots based on type
  let slots: Slot[] = [];
  if (accountData.type === AccountType.SHARED) {
    for (let i = 0; i < (accountData.maxSlots || 1); i++) {
      slots.push({
        id: generateId(),
        customerId: null,
        customerName: '',
        isOccupied: false
      });
    }
  } else {
    slots.push({
      id: generateId(),
      customerId: null,
      customerName: '',
      isOccupied: false
    });
  }

  const newAccount: Account = {
    id: generateId(),
    createdAt: Date.now(),
    serviceName: accountData.serviceName || 'Other',
    email: accountData.email || '',
    password: accountData.password || '',
    expirationDate: accountData.expirationDate || '',
    type: accountData.type || AccountType.PRIVATE,
    maxSlots: accountData.maxSlots || 1,
    slots: slots,
  };

  accounts.push(newAccount);
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  return newAccount;
};

export const updateAccount = (account: Account): void => {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.id === account.id);
  
  if (index !== -1) {
    // If maxSlots changed, we might need to adjust the slots array
    // This is a simple implementation that truncates or adds empty slots
    let currentSlots = account.slots;
    if (account.maxSlots > currentSlots.length) {
       const needed = account.maxSlots - currentSlots.length;
       for(let i=0; i<needed; i++) {
         currentSlots.push({ id: generateId(), customerId: null, customerName: '', isOccupied: false });
       }
    } else if (account.maxSlots < currentSlots.length) {
       currentSlots = currentSlots.slice(0, account.maxSlots);
    }
    
    accounts[index] = { ...account, slots: currentSlots };
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }
};

export const deleteAccount = (id: string): void => {
  const accounts = getAccounts();
  const filtered = accounts.filter(acc => acc.id !== id);
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(filtered));
};

export const updateSlot = (accountId: string, slotId: string, customerId: string | null, customerName: string): void => {
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex(a => a.id === accountId);
  if (accountIndex === -1) return;

  const slotIndex = accounts[accountIndex].slots.findIndex(s => s.id === slotId);
  if (slotIndex === -1) return;

  accounts[accountIndex].slots[slotIndex].customerId = customerId;
  accounts[accountIndex].slots[slotIndex].customerName = customerName;
  accounts[accountIndex].slots[slotIndex].isOccupied = !!customerName;

  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
};

// --- CUSTOMERS ---

export const getCustomers = (): Customer[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  return data ? JSON.parse(data) : [];
};

export const saveCustomer = (customer: Omit<Customer, 'id'>): Customer => {
  const customers = getCustomers();
  const newCustomer = { ...customer, id: generateId() };
  customers.push(newCustomer);
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  return newCustomer;
};

export const deleteCustomer = (id: string): void => {
  const customers = getCustomers().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
};

// --- TELEGRAM ---

const DEFAULT_TELEGRAM: TelegramConfig = {
  botToken: '',
  chatId: '',
  intervalValue: 24,
  intervalUnit: 'hours',
  enabled: false
};

export const getTelegramConfig = (): TelegramConfig => {
  const data = localStorage.getItem(STORAGE_KEYS.TELEGRAM_CONFIG);
  return data ? { ...DEFAULT_TELEGRAM, ...JSON.parse(data) } : DEFAULT_TELEGRAM;
};

export const saveTelegramConfig = (config: TelegramConfig) => {
  localStorage.setItem(STORAGE_KEYS.TELEGRAM_CONFIG, JSON.stringify(config));
};
