import React, { useState, useEffect } from 'react';
import { X, Save, Bell, Clock } from 'lucide-react';
import { subscribeToTelegramConfig, saveTelegramConfig } from '../services/dataService';
import { sendExpirationAlert } from '../services/telegramService';
import { TelegramConfig } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfigSave: () => void; // Callback to notify app of config change
}

const TelegramSettings: React.FC<Props> = ({ isOpen, onClose, onConfigSave }) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(false);
  
  // Timer settings
  const [intervalValue, setIntervalValue] = useState(24);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Subscribe to settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = subscribeToTelegramConfig((config) => {
          setBotToken(config.botToken);
          setChatId(config.chatId);
          setIntervalValue(config.intervalValue);
          setIntervalUnit(config.intervalUnit);
          setEnabled(config.enabled);
      });
      setStatusMsg('');
      return () => unsubscribe();
    }
  }, [isOpen]);

  const handleSave = async () => {
    const config: TelegramConfig = {
        botToken,
        chatId,
        intervalValue: Number(intervalValue),
        intervalUnit,
        enabled
    };
    try {
        await saveTelegramConfig(config);
        onConfigSave(); // Logic handles in App.tsx via live subscription, but we call for safety
        setStatusMsg('Settings saved successfully.');
        setTimeout(() => onClose(), 1500);
    } catch (e) {
        setStatusMsg('Error saving settings.');
    }
  };

  const handleTest = async () => {
    // Note: We need to pass the config explicitly here because the service 
    // now requires arguments if we want to test "unsaved" config, 
    // OR we just test what's saved. 
    // To keep it simple, we warn users to save first, or we pass this config.
    // The previous implementation of sendExpirationAlert read from storage.
    // The new one reads from arguments.
    
    setLoading(true);
    setStatusMsg('Sending test report...');
    
    // We cannot easily fetch 'accounts' here without props.
    // For the test button, let's just test the connection validity message?
    // Or we modify the service to accept null accounts and just send a "Test Connected" msg.
    // To stick to the existing logic, we will trigger it with null accounts which returns "No accounts"
    // OR we simply display a message "Save settings to test automatically".
    
    // Better: We send a generic test message.
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "✅ <b>Test Message</b>\n\nResellerVault is connected successfully.",
            parse_mode: 'HTML',
          }),
        });
        const data = await response.json();
        if (data.ok) setStatusMsg('Test successful! Check your Telegram.');
        else throw new Error(data.description);
    } catch (e: any) {
        setStatusMsg('Error: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 rounded-full">
               <Bell size={20} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Telegram Alerts</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>

        <div className="space-y-4">
          
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
             <span className="text-white font-medium">Enable Auto-Check</span>
             <button 
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full transition relative ${enabled ? 'bg-green-500' : 'bg-slate-600'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${enabled ? 'left-7' : 'left-1'}`} />
             </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Bot Token</label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="123456:ABC..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="123456789"
            />
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2 mb-2 text-slate-300">
                <Clock size={16} />
                <span className="text-sm font-medium">Check Frequency</span>
            </div>
            <div className="flex gap-2">
                <input 
                    type="number" 
                    min="1"
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(Number(e.target.value))}
                    className="w-24 bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                />
                <select 
                    value={intervalUnit}
                    onChange={(e) => setIntervalUnit(e.target.value as any)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
                >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                </select>
            </div>
            <p className="text-xs text-slate-500 mt-2">
                The app must be open for the timer to run in this demo.
            </p>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-lg text-sm ${statusMsg.includes('Error') || statusMsg.includes('not') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {statusMsg}
            </div>
          )}

          <div className="flex gap-3 mt-4">
             <button
              onClick={handleTest}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg border border-slate-600 transition"
            >
              {loading ? '...' : 'Test'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSettings;