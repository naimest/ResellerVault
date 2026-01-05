import { Account, TelegramConfig } from '../types';

// Helper to check days remaining
const getDaysRemaining = (dateStr: string): number => {
  const target = new Date(dateStr);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const sendExpirationAlert = async (accounts: Account[], config: TelegramConfig): Promise<{ success: boolean; message: string }> => {
  const { botToken, chatId } = config;

  if (!botToken || !chatId) {
    return { success: false, message: 'Telegram Bot Token or Chat ID not configured.' };
  }

  const expiringAccounts: Account[] = accounts.filter(acc => {
    const days = getDaysRemaining(acc.expirationDate);
    // Alert if expiring within 3 days
    return days <= 3 && days >= 0; 
  });

  if (expiringAccounts.length === 0) {
    return { success: true, message: 'No accounts expiring soon. No message sent.' };
  }

  // Aggregate by Service
  const summary: Record<string, number> = {};
  expiringAccounts.forEach(acc => {
    summary[acc.serviceName] = (summary[acc.serviceName] || 0) + 1;
  });

  const summaryText = Object.entries(summary)
    .map(([service, count]) => `• ${service}: ${count} account(s)`)
    .join('\n');

  const message = `
⚠️ <b>Daily Expiration Report</b>

You have <b>${expiringAccounts.length}</b> account(s) expiring within 3 days:

${summaryText}

Please renew them via the dashboard.
  `;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!data.ok) {
        throw new Error(data.description || 'Telegram API Error');
    }

    return { success: true, message: `Sent alert for ${expiringAccounts.length} accounts.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};