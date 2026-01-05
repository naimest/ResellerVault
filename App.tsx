import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Search, 
  Users, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Edit2, 
  Trash2, 
  Briefcase,
  LogOut,
  AlertOctagon
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './services/firebase';
import Login from './components/Login';
import AccountModal from './components/AddAccountModal';
import TelegramSettings from './components/TelegramSettings';
import CustomerManager from './components/CustomerManager';
import SlotItem from './components/SlotItem';
import { 
  subscribeToAccounts, 
  subscribeToCustomers, 
  subscribeToTelegramConfig, 
  saveAccount, 
  deleteAccount, 
  updateSlot, 
  updateAccount 
} from './services/dataService';
import { sendExpirationAlert } from './services/telegramService';
import { Account, AccountType, Customer, TelegramConfig } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Data State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);

  const [currentView, setCurrentView] = useState<'dashboard' | 'customers'>('dashboard');
  
  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  
  // Filters
  const [filterService, setFilterService] = useState<string>('All');
  
  // Telegram Timer Ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Subscriptions (Only if logged in)
  useEffect(() => {
    if (!user) return;

    const handleDbError = (error: any) => {
        console.error("Database Error:", error);
        if (error.code === 'permission-denied') {
            setDbError("Access Denied: Please update your Firestore Security Rules to 'allow read, write: if request.auth != null;'");
        } else {
            setDbError(`Database Connection Error: ${error.message}`);
        }
    };

    const unsubAccounts = subscribeToAccounts(
        (data) => {
            setAccounts(data);
            setDbError(null); // Clear error on success
        },
        handleDbError
    );

    const unsubCustomers = subscribeToCustomers(
        (data) => setCustomers(data), 
        (err) => console.log("Customer sub error (handled by main)") // Optional: Suppress duplicate alerts
    );
    
    const unsubTelegram = subscribeToTelegramConfig(
        (data) => setTelegramConfig(data),
        (err) => console.log("Telegram sub error (handled by main)")
    );

    return () => {
      unsubAccounts();
      unsubCustomers();
      unsubTelegram();
    };
  }, [user]);

  // Handle Telegram Timer based on live config
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (!telegramConfig || !telegramConfig.enabled || !telegramConfig.intervalValue) return;

    let ms = 0;
    if (telegramConfig.intervalUnit === 'minutes') ms = telegramConfig.intervalValue * 60 * 1000;
    else if (telegramConfig.intervalUnit === 'hours') ms = telegramConfig.intervalValue * 60 * 60 * 1000;
    else if (telegramConfig.intervalUnit === 'days') ms = telegramConfig.intervalValue * 24 * 60 * 60 * 1000;

    console.log(`Telegram Auto-Check configured. Running every ${ms}ms`);

    timerRef.current = setInterval(() => {
        sendExpirationAlert(accounts, telegramConfig); 
    }, ms);

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [telegramConfig, accounts]);

  // --- Handlers ---

  const handleSaveAccount = async (data: any) => {
    try {
      if (data.id) {
          await updateAccount(data);
      } else {
          await saveAccount(data);
      }
      setEditingAccount(null);
    } catch (error: any) {
      console.error("Error saving account:", error);
      if (error.code === 'permission-denied') {
        alert("Cannot Save: Permission Denied. Check Firestore Rules.");
      } else {
        alert("Failed to save account: " + error.message);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteAccount(id);
      } catch (error: any) {
        console.error("Error deleting account:", error);
        alert("Failed to delete: " + error.message);
      }
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const handleSlotUpdate = async (accId: string, slotId: string, customerId: string | null, name: string) => {
    try {
      await updateSlot(accId, slotId, customerId, name);
    } catch (error) {
      console.error("Error updating slot:", error);
    }
  };

  // --- Helpers ---

  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpirationColor = (dateStr: string) => {
    const days = getDaysRemaining(dateStr);
    if (days < 0) return 'text-red-500 bg-red-500/10 border-red-500/20'; // Expired
    if (days <= 3) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'; // Warning
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'; // Safe
  };

  // Stats
  const stats = {
    total: accounts.length,
    expiring: accounts.filter(a => {
        const d = getDaysRemaining(a.expirationDate);
        return d >= 0 && d <= 3;
    }).length,
    emptySlots: accounts.reduce((acc, curr) => {
        return acc + curr.slots.filter(s => !s.isOccupied).length;
    }, 0)
  };

  // Dynamic Service List for Filter Bar
  const uniqueServices = Array.from(new Set(accounts.map(a => a.serviceName)));
  const filteredAccounts = filterService === 'All' 
    ? accounts 
    : accounts.filter(a => a.serviceName === filterService);

  if (loadingAuth) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading...</div>;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 font-sans">
      
      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
             <LayoutDashboard size={18} className="text-white" />
           </div>
           <h1 className="font-bold text-lg tracking-tight text-white">ResellerVault</h1>
        </div>
        <button 
           onClick={() => {
               setEditingAccount(null);
               setIsAccountModalOpen(true);
           }}
           className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-lg"
        >
           <Plus size={20} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex-col hidden md:flex fixed h-full z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">ResellerVault</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium border transition ${currentView === 'dashboard' ? 'bg-slate-800/50 text-indigo-400 border-slate-700/50' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          
          <button 
             onClick={() => setCurrentView('customers')}
             className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium border transition ${currentView === 'customers' ? 'bg-slate-800/50 text-indigo-400 border-slate-700/50' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            <Users size={18} />
            Customers
          </button>

          <button onClick={() => setIsTelegramModalOpen(true)} className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition border border-transparent">
            <Settings size={18} />
            Alert Settings
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button onClick={() => auth.signOut()} className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition">
              <LogOut size={18} />
              Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8 overflow-y-auto min-h-screen">
        
        {/* Database Error Banner */}
        {dbError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex items-start gap-3">
             <AlertOctagon className="text-red-500 shrink-0 mt-0.5" size={24} />
             <div className="flex-1">
               <h3 className="text-red-400 font-bold">Database Access Error</h3>
               <p className="text-red-300/80 text-sm mt-1">{dbError}</p>
             </div>
          </div>
        )}

        {currentView === 'customers' ? (
            <CustomerManager />
        ) : (
            <>
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                  <div className="bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Total Accounts</p>
                      <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Expiring Soon</p>
                      <p className="text-2xl font-bold text-white">{stats.expiring}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Empty Slots</p>
                      <p className="text-2xl font-bold text-white">{stats.emptySlots}</p>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  {/* Horizontal Scroll Filter */}
                  <div className="w-full md:w-auto flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar scroll-smooth">
                    <button
                        onClick={() => setFilterService('All')}
                        className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition ${filterService === 'All' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        All
                    </button>
                    {uniqueServices.map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterService(s)}
                        className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition ${filterService === s ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => {
                        setEditingAccount(null);
                        setIsAccountModalOpen(true);
                    }}
                    className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-indigo-600/20 transition whitespace-nowrap"
                  >
                    <Plus size={18} />
                    Add Account
                  </button>
                </div>

                {/* Accounts Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
                  {filteredAccounts.map(account => {
                     const daysLeft = getDaysRemaining(account.expirationDate);
                     const expColorClass = getExpirationColor(account.expirationDate);
                     
                     return (
                      <div key={account.id} className="bg-slate-900 border border-slate-800 rounded-2xl transition group relative">
                        {/* Card Header */}
                        <div className="p-5 border-b border-slate-800 flex justify-between items-start rounded-t-2xl">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-300">
                              {account.serviceName[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-white text-lg truncate">{account.serviceName}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400 mt-1">
                                <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 select-all truncate max-w-[150px]">
                                  {account.email}
                                </span>
                                {account.type === AccountType.SHARED && (
                                  <span className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded text-xs font-medium border border-indigo-500/20">
                                    Shared
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 shrink-0">
                             <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${expColorClass}`}>
                                {daysLeft < 0 ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                                <span className="hidden sm:inline">{daysLeft < 0 ? 'Expired' : `${daysLeft} days left`}</span>
                                <span className="sm:hidden">{daysLeft < 0 ? 'Exp' : `${daysLeft}d`}</span>
                             </div>
                          </div>
                        </div>

                        {/* Slots Section */}
                        <div className="p-5 bg-slate-900/50 rounded-b-2xl">
                          <div className="flex justify-between items-center mb-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {account.type === AccountType.PRIVATE ? 'Customer' : `Slots (${account.slots.filter(s => s.isOccupied).length}/${account.maxSlots})`}
                            </p>
                            <div className="flex gap-2">
                                <button 
                                  onClick={() => handleEdit(account)}
                                  className="text-slate-500 hover:text-white bg-slate-800 p-1.5 rounded-md transition"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(account.id)}
                                  className="text-slate-500 hover:text-red-400 bg-slate-800 p-1.5 rounded-md transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {account.slots.map((slot, idx) => (
                              <SlotItem 
                                key={slot.id}
                                index={idx}
                                slot={slot}
                                customers={customers}
                                onUpdate={(customerId, name) => handleSlotUpdate(account.id, slot.id, customerId, name)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                     );
                  })}
                  
                  {filteredAccounts.length === 0 && (
                     <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                       {dbError ? (
                           <AlertOctagon size={48} className="mb-4 text-red-500/50" />
                       ) : (
                           <Search size={48} className="mb-4 opacity-50" />
                       )}
                       <p>{dbError ? "Fix Database Permissions to see accounts" : "No accounts found."}</p>
                     </div>
                  )}
                </div>
            </>
        )}

      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('customers')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'customers' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <Users size={20} />
            <span className="text-[10px] font-medium">Customers</span>
          </button>

          <button 
            onClick={() => setIsTelegramModalOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500"
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
          
          <button 
             onClick={() => auth.signOut()}
             className="flex flex-col items-center justify-center w-full h-full space-y-1 text-red-500/70"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Exit</span>
          </button>
        </div>
      </nav>

      <AccountModal 
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleSaveAccount}
        initialData={editingAccount}
      />

      <TelegramSettings
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onConfigSave={() => { /* No-op: handled by useEffect listening to live data */ }}
      />
    </div>
  );
};

export default App;
