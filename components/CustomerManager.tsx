import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { subscribeToCustomers, saveCustomer, deleteCustomer } from '../services/dataService';
import { Trash2, UserPlus, Phone, User, Search } from 'lucide-react';

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCustomers((data) => {
        setCustomers(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    try {
        await saveCustomer({ name: newName, contact: newContact });
        setNewName('');
        setNewContact('');
    } catch (err) {
        console.error("Failed to add customer", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this customer? This will NOT remove them from active slots, but they will disappear from future lists.')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        console.error("Failed to delete customer", err);
      }
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-20 md:pb-0">
      {/* Add Form */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:sticky lg:top-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-indigo-400"/>
                Add Customer
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                    <input 
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="John Doe"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Contact (Optional)</label>
                    <input 
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Email or Phone"
                        value={newContact}
                        onChange={e => setNewContact(e.target.value)}
                    />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition">
                    Create Customer
                </button>
            </form>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
         <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-auto lg:h-full lg:min-h-[500px]">
            <div className="p-4 border-b border-slate-800 flex gap-4 sticky top-0 bg-slate-900 z-10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search customers..." 
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            {/* On mobile, remove flex-1 and overflow to let it grow naturally. On Desktop, keep scroll */}
            <div className="lg:flex-1 lg:overflow-y-auto p-2 space-y-2 min-h-[300px]">
                {filtered.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-950/50 hover:bg-slate-800/50 rounded-xl transition border border-transparent hover:border-slate-700 group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                                {c.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-white truncate">{c.name}</p>
                                <div className="flex items-center gap-1.5 text-sm text-slate-500 truncate">
                                    <Phone size={12} className="shrink-0" />
                                    {c.contact || 'No contact info'}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleDelete(c.id)}
                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition shrink-0"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                        <User size={32} className="mb-2 opacity-50" />
                        <p>No customers found.</p>
                    </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default CustomerManager;