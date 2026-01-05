import { Account, TelegramConfig } from '../types';

// Helper to check days remaining
const getDaysRemaining = (dateStr: string): number => {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  const now = new Date();
  // Reset hours to compare dates strictly by calendar day
  target.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const sendExpirationAlert = async (accounts: Account[], config: TelegramConfig): Promise<{ success: boolean; message: string }> => {
  const { botToken, chatId } = config;

  if (!botToken || !chatId) {
    return { success: false, message: 'Telegram Bot Token or Chat ID not configured.' };
  }

  let messageParts: string[] = [];
  let alertCount = 0;

  // 1. Check Full Account Expirations
  const expiringAccounts = accounts.filter(acc => {
      const days = getDaysRemaining(acc.expirationDate);
      return days <= 3 && days >= 0;
  });

  if (expiringAccounts.length > 0) {
      messageParts.push(`<b>📢 Accounts Expiring Soon</b>`);
      
      expiringAccounts.forEach(acc => {
          const days = getDaysRemaining(acc.expirationDate);
          
          let accountMsg = `\n🔴 <b>${acc.serviceName}</b>`;
          accountMsg += `\n📧 ${acc.email}`;
          accountMsg += `\n⏳ Expires in: ${days} days`;
          
          // Find occupied slots to list affected customers
          const occupiedSlots = acc.slots
            .map((slot, index) => ({ ...slot, realIndex: index + 1 }))
            .filter(s => s.isOccupied);

          if (occupiedSlots.length > 0) {
              accountMsg += `\n👥 <b>Affected Customers:</b>`;
              occupiedSlots.forEach((slot) => {
                  accountMsg += `\n   ├ Slot ${slot.realIndex}: ${slot.customerName}`;
              });
          } else {
              accountMsg += `\n   (No active customers)`;
          }
          accountMsg += `\n`; // Spacing
          
          messageParts.push(accountMsg);
          alertCount++;
      });
  }

  // 2. Check Individual Slot Expirations
  // (For accounts that are NOT expiring yet, but have specific slots expiring)
  const safeAccounts = accounts.filter(acc => {
      const days = getDaysRemaining(acc.expirationDate);
      return days > 3; 
  });

  let slotAlerts: string[] = [];

  safeAccounts.forEach(acc => {
      acc.slots.forEach((slot, index) => {
          if (slot.isOccupied && slot.expirationDate) {
              const days = getDaysRemaining(slot.expirationDate);
              if (days <= 3 && days >= 0) {
                  let slotMsg = `\n🟠 <b>Slot Expiration</b>`;
                  slotMsg += `\n👤 Customer: ${slot.customerName}`;
                  slotMsg += `\n📦 Service: ${acc.serviceName} (Slot ${index + 1})`;
                  slotMsg += `\n📧 Account: ${acc.email}`;
                  slotMsg += `\n⏳ Expires in: ${days} days\n`;
                  slotAlerts.push(slotMsg);
                  alertCount++;
              }
          }
      });
  });

  if (slotAlerts.length > 0) {
      // Add separator if we have both types of alerts
      if (messageParts.length > 0) messageParts.push(`\n➖ ➖ ➖ ➖ ➖\n`);
      messageParts.push(`<b>📢 Individual Slots Expiring</b>`);
      messageParts.push(...slotAlerts);
  }

  if (alertCount === 0) {
    return { success: true, message: 'No immediate expirations found.' };
  }

  const fullMessage = messageParts.join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: fullMessage,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!data.ok) {
        throw new Error(data.description || 'Telegram API Error');
    }

    return { success: true, message: `Sent alerts for ${alertCount} items.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
