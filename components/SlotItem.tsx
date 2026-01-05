import React, { useState, useRef, useEffect } from 'react';
import { Slot, Customer } from '../types';
import { X, Search } from 'lucide-react';

interface Props {
  slot: Slot;
  index: number;
  customers: Customer[];
  onUpdate: (customerId: string | null, name: string) => void;
}

const SlotItem: React.FC<Props> = ({ slot, index, customers, onUpdate }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsSearching(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onUpdate(customer.id, customer.name);
    setIsSearching(false);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onUpdate(null, '');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determine what name to display
  // Priority: Linked Customer Name -> Stored Legacy Name -> Empty
  const linkedCustomer = customers.find(c => c.id === slot.customerId);
  const displayName = linkedCustomer ? linkedCustomer.name : slot.customerName;

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800 transition-colors focus-within:border-indigo-500/50">
      {/* Status Dot */}
      <div className={`shrink-0 w-2 h-2 rounded-full ${slot.isOccupied ? 'bg-emerald-500' : 'bg-slate-700'}`} />
      
      {/* Slot Number */}
      <span className="shrink-0 text-xs text-slate-500 w-6">#{index + 1}</span>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {slot.isOccupied && !isSearching ? (
          <div className="flex items-center justify-between group">
             <div className="flex items-center gap-2 overflow-hidden">
               <span className="text-sm text-white truncate">{displayName}</span>
               {linkedCustomer && linkedCustomer.contact && (
                   <span className="text-xs text-slate-500 truncate hidden sm:inline-block">
                       • {linkedCustomer.contact}
                   </span>
               )}
             </div>
             <button 
               onClick={handleClear}
               className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
               title="Clear slot"
             >
               <X size={14} />
             </button>
          </div>
        ) : (
          <div className="relative">
             <div className="flex items-center">
                <Search size={14} className="text-slate-500 mr-2 absolute left-0 top-1/2 -translate-y-1/2" />
                <input 
                    type="text"
                    className="w-full bg-transparent border-none text-sm text-slate-200 placeholder-slate-600 focus:ring-0 p-0 pl-6 h-6"
                    placeholder="Search client..."
                    value={searchTerm}
                    onFocus={() => { setIsSearching(true); setShowDropdown(true); }}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             
             {/* Dropdown Results */}
             {showDropdown && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                            <button
                                key={c.id}
                                onClick={() => handleSelect(c)}
                                className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-white transition flex items-center justify-between border-b border-slate-800/50 last:border-0"
                            >
                                <span className="font-medium truncate">{c.name}</span>
                                {c.contact && <span className="text-xs text-slate-500 truncate ml-2 opacity-70">{c.contact}</span>}
                            </button>
                        ))
                    ) : (
                        <div className="px-3 py-3 text-xs text-slate-500 text-center">No clients found</div>
                    )}
                 </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotItem;
