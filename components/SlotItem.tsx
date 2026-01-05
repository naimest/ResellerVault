import React, { useState, useRef, useEffect } from 'react';
import { Slot, Customer } from '../types';
import { X, Search, Check, Calendar, RotateCcw, UserCircle } from 'lucide-react';

interface Props {
  slot: Slot;
  index: number;
  customers: Customer[];
  accountExpirationDate: string; // Passed from parent to set default
  onUpdate: (customerId: string | null, name: string, date: string, profileName: string) => void;
}

const SlotItem: React.FC<Props> = ({ slot, index, customers, accountExpirationDate, onUpdate }) => {
  // Modes: 'view', 'searching' (showing input), 'confirming' (showing date/profile picker)
  const [mode, setMode] = useState<'view' | 'searching' | 'confirming'>('view');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string | null, name: string} | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [profileNameInput, setProfileNameInput] = useState('');
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize date only once or when account date changes
  useEffect(() => {
    if (mode === 'view' && !slot.isOccupied) {
        setExpiryDate(accountExpirationDate);
        setProfileNameInput('');
    }
  }, [accountExpirationDate, mode, slot.isOccupied]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (mode === 'searching') {
            setMode('view');
            setSearchTerm('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mode]);

  // Helpers
  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return 999;
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = slot.expirationDate ? getDaysRemaining(slot.expirationDate) : 999;
  
  let statusColor = 'bg-slate-700'; // Empty
  if (slot.isOccupied) {
      if (daysLeft < 0) statusColor = 'bg-red-500';
      else if (daysLeft <= 3) statusColor = 'bg-yellow-500';
      else statusColor = 'bg-emerald-500';
  }

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer({ id: c.id, name: c.name });
    setMode('confirming');
    setExpiryDate(accountExpirationDate); // Default to account expiry
    setProfileNameInput(''); // Reset profile name on new selection
  };

  const handleConfirm = () => {
    if (selectedCustomer) {
        onUpdate(selectedCustomer.id, selectedCustomer.name, expiryDate, profileNameInput);
        setMode('view');
        setSearchTerm('');
    }
  };

  const handleClear = () => {
    if (window.confirm("Remove this customer from the slot?")) {
        onUpdate(null, '', '', '');
    }
  };
  
  const handleQuickRenew = () => {
     // Just opens the date picker mode for existing user
     setSelectedCustomer({ id: slot.customerId, name: slot.customerName });
     setExpiryDate(slot.expirationDate || accountExpirationDate);
     setProfileNameInput(slot.profileName || '');
     setMode('confirming');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Name resolution
  const linkedCustomer = customers.find(c => c.id === slot.customerId);
  const displayName = linkedCustomer ? linkedCustomer.name : slot.customerName;

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800 transition-colors hover:border-slate-700">
      
      {/* Status Dot */}
      <div className={`shrink-0 w-2 h-2 rounded-full transition-colors ${statusColor}`} title={slot.isOccupied ? `${daysLeft} days left` : 'Empty'} />
      
      {/* Slot Index */}
      <span className="shrink-0 text-xs text-slate-500 w-5">#{index + 1}</span>

      <div className="flex-1 relative">
        
        {/* VIEW MODE: OCCUPIED */}
        {mode === 'view' && slot.isOccupied && (
           <div className="flex items-center justify-between group">
              <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">{displayName}</span>
                    {linkedCustomer?.contact && (
                        <span className="text-[10px] text-slate-500 hidden sm:inline-block truncate max-w-[100px]">{linkedCustomer.contact}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                     
                     {/* Expiry Date */}
                     <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{slot.expirationDate || 'No Date'}</span>
                        {daysLeft < 0 && <span className="text-red-400 font-bold ml-1">(Exp)</span>}
                     </div>

                     {/* Profile Name Badge */}
                     {slot.profileName && (
                        <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 border border-slate-700">
                            <UserCircle size={10} />
                            <span className="max-w-[80px] truncate">{slot.profileName}</span>
                        </div>
                     )}

                  </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button 
                     onClick={handleQuickRenew}
                     className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded"
                     title="Edit Details / Renew"
                  >
                      <RotateCcw size={14} />
                  </button>
                  <button 
                     onClick={handleClear}
                     className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded"
                     title="Clear Slot"
                  >
                      <X size={14} />
                  </button>
              </div>
           </div>
        )}

        {/* VIEW MODE: EMPTY (Show Search Input) */}
        {mode === 'view' && !slot.isOccupied && (
            <div className="relative">
                <Search size={14} className="text-slate-600 absolute left-0 top-1/2 -translate-y-1/2" />
                <input 
                    type="text"
                    className="w-full bg-transparent border-none text-sm text-slate-300 placeholder-slate-600 focus:ring-0 p-0 pl-6 h-8 cursor-pointer"
                    placeholder="Assign Customer..."
                    onFocus={() => {
                        setMode('searching');
                        setSearchTerm('');
                    }}
                />
            </div>
        )}

        {/* SEARCHING MODE */}
        {mode === 'searching' && (
            <div className="relative">
                <Search size={14} className="text-indigo-500 absolute left-0 top-1/2 -translate-y-1/2" />
                <input 
                    type="text"
                    autoFocus
                    className="w-full bg-transparent border-none text-sm text-white placeholder-slate-500 focus:ring-0 p-0 pl-6 h-8"
                    placeholder="Type to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                {/* Dropdown */}
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                        <button
                            key={c.id}
                            onMouseDown={() => handleSelectCustomer(c)} // onMouseDown fires before onBlur/clickOutside
                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-white transition flex items-center justify-between border-b border-slate-800/50 last:border-0"
                        >
                            <span className="font-medium truncate">{c.name}</span>
                            {c.contact && <span className="text-xs text-slate-500 truncate ml-2 opacity-70">{c.contact}</span>}
                        </button>
                    ))}
                    {searchTerm && (
                         <button
                            onMouseDown={() => {
                                setSelectedCustomer({ id: null, name: searchTerm });
                                setMode('confirming');
                                setExpiryDate(accountExpirationDate);
                                setProfileNameInput('');
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-indigo-400 hover:bg-indigo-600/10 font-medium border-t border-slate-700"
                        >
                            + Add "{searchTerm}" as guest
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* CONFIRMING MODE (Set Details) */}
        {mode === 'confirming' && (
            <div className="flex items-center gap-2 w-full">
                <span className="text-sm font-medium text-white truncate max-w-[80px] shrink-0" title={selectedCustomer?.name}>
                    {selectedCustomer?.name}
                </span>
                
                {/* Profile Name Input */}
                <input 
                    type="text" 
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="Profile"
                    className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500 w-20 shrink-1 min-w-0 placeholder-slate-600"
                />

                {/* Date Input */}
                <input 
                    type="date" 
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark] flex-1 min-w-0"
                />

                <button 
                    onClick={handleConfirm}
                    className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 shrink-0"
                >
                    <Check size={14} />
                </button>
                <button 
                    onClick={() => {
                        setMode('view');
                        if(!slot.isOccupied) setSearchTerm('');
                    }}
                    className="p-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 shrink-0"
                >
                    <X size={14} />
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default SlotItem;
