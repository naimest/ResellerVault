import React, { useState, useEffect } from 'react';
import { AccountType, ServiceName, Account } from '../types';
import { SERVICE_DEFAULTS } from '../constants';
import { X, Check, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Account | null; // If present, we are editing
}

const AccountModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [isCustomService, setIsCustomService] = useState(false);
  const [serviceName, setServiceName] = useState<string>(ServiceName.NETFLIX);
  const [customServiceName, setCustomServiceName] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.PRIVATE);
  const [maxSlots, setMaxSlots] = useState(1);

  // Load initial data for editing
  useEffect(() => {
    if (isOpen && initialData) {
      const isStandard = Object.values(ServiceName).includes(initialData.serviceName as ServiceName);
      
      if (isStandard) {
        setServiceName(initialData.serviceName);
        setIsCustomService(false);
      } else {
        setServiceName('Custom');
        setIsCustomService(true);
        setCustomServiceName(initialData.serviceName);
      }
      
      setEmail(initialData.email);
      setPassword(initialData.password);
      setExpirationDate(initialData.expirationDate);
      setType(initialData.type);
      setMaxSlots(initialData.maxSlots);
    } else if (isOpen && !initialData) {
      // Reset for new entry
      setServiceName(ServiceName.NETFLIX);
      setIsCustomService(false);
      setCustomServiceName('');
      setEmail('');
      setPassword('');
      setExpirationDate('');
      setType(AccountType.PRIVATE);
      setMaxSlots(1);
    }
  }, [isOpen, initialData]);

  // Update default slots when service changes (only for new accounts or shared type toggles)
  useEffect(() => {
    if (!initialData && type === AccountType.SHARED) {
      if (!isCustomService) {
        const def = SERVICE_DEFAULTS[serviceName] || SERVICE_DEFAULTS[ServiceName.OTHER];
        setMaxSlots(def.defaultSlots);
      }
    } else if (!initialData && type === AccountType.PRIVATE) {
      setMaxSlots(1);
    }
  }, [serviceName, type, isCustomService, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalServiceName = isCustomService ? customServiceName : serviceName;

    const payload = {
      serviceName: finalServiceName,
      email,
      password,
      expirationDate,
      type,
      maxSlots: type === AccountType.SHARED ? maxSlots : 1,
      ...(initialData ? { id: initialData.id, slots: initialData.slots, createdAt: initialData.createdAt } : {})
    };

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Account' : 'Add New Inventory'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Service Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400">Service</label>
            <div className="flex gap-2">
              <select
                value={isCustomService ? 'Custom' : serviceName}
                onChange={(e) => {
                  if (e.target.value === 'Custom') {
                    setIsCustomService(true);
                  } else {
                    setIsCustomService(false);
                    setServiceName(e.target.value);
                  }
                }}
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {Object.values(ServiceName).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="Custom">+ Custom Service</option>
              </select>
            </div>
            {isCustomService && (
               <input 
                 type="text"
                 required
                 value={customServiceName}
                 onChange={(e) => setCustomServiceName(e.target.value)}
                 placeholder="Enter service name (e.g. Hulu, HBO)"
                 className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
               />
            )}
          </div>

          {/* Account Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Account Type</label>
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setType(AccountType.PRIVATE)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${type === AccountType.PRIVATE ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Private
              </button>
              <button
                type="button"
                onClick={() => setType(AccountType.SHARED)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${type === AccountType.SHARED ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Shared
              </button>
            </div>
          </div>

          {/* Slots (Only if Shared) */}
          {type === AccountType.SHARED && (
             <div>
             <label className="block text-sm font-medium text-slate-400 mb-1">Number of Slots</label>
             <input
               type="number"
               min="2"
               max="50"
               value={maxSlots}
               onChange={(e) => setMaxSlots(parseInt(e.target.value))}
               className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
             />
           </div>
          )}

          {/* Email & Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="acc@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Secret123"
              />
            </div>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Expiration Date</label>
            <input
              type="date"
              required
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none [color-scheme:dark]"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
          >
            {initialData ? <Save size={20}/> : <Check size={20} />}
            {initialData ? 'Update Account' : 'Save Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;