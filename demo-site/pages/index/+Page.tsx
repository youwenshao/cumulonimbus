import React, { useState, useMemo, useEffect } from 'react';
import { 
  Coffee, 
  Utensils, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  ChefHat, 
  Plus, 
  Search,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Mock Hook ---
function useAppData() {
  // Initialize data directly without useEffect for static site compatibility
  const initialData = [
    { id: 'o1', tableId: '3', items: '2x Satay Beef Noodles\n1x Milk Tea (Hot)', status: 'cooking', total: 114, createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: 'o2', tableId: '5', items: '1x Pineapple Bun w/ Butter\n1x Lemon Tea (Iced)', status: 'pending', total: 38, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: 'o3', tableId: '1', items: '1x Baked Pork Chop Rice', status: 'served', total: 58, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  ];

  const [data, setData] = useState<any[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const addRecord = (record: any) => {
    const newRecord = { 
      ...record, 
      id: Math.random().toString(36).substr(2, 9), 
      createdAt: new Date().toISOString() 
    };
    setData(prev => [newRecord, ...prev]);
  };

  const updateRecord = (id: string, updates: any) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRecord = (id: string) => {
    setData(prev => prev.filter(r => r.id !== id));
  };

  return { data, isLoading, addRecord, updateRecord, deleteRecord };
}

// --- Menu Data ---
const MENU_ITEMS = [
  { id: '1', code: 'A1', name: 'Satay Beef Noodles', price: 48, category: 'set' },
  { id: '2', code: 'A2', name: 'Spiced Pork Cubes Instant Noodles', price: 46, category: 'set' },
  { id: '3', code: 'T1', name: 'HK Style Milk Tea (Hot)', price: 18, category: 'drink' },
  { id: '4', code: 'T2', name: 'Lemon Tea (Iced)', price: 22, category: 'drink' },
  { id: '5', code: 'C1', name: 'Coffee (Hot)', price: 18, category: 'drink' },
  { id: '6', code: 'YT', name: 'Yuen Yeung (Coffee+Tea)', price: 20, category: 'drink' },
  { id: '7', code: 'F1', name: 'Pineapple Bun w/ Butter', price: 16, category: 'snack' },
  { id: '8', code: 'F2', name: 'French Toast', price: 28, category: 'snack' },
  { id: '9', code: 'L1', name: 'Baked Pork Chop Rice', price: 58, category: 'rice' },
  { id: '10', code: 'L2', name: 'Yangzhou Fried Rice', price: 52, category: 'rice' },
];

const TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', 'A1', 'A2', 'B1', 'B2'];

export default function Page() {
  const { data: orders, addRecord, updateRecord, deleteRecord, isLoading } = useAppData();
  const [activeTab, setActiveTab] = useState('kitchen');
  const [showNewOrder, setShowNewOrder] = useState(false);

  const activeOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o: any) => o.status !== 'paid').sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const completedOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o: any) => o.status === 'paid');
  }, [orders]);

  const dailyRevenue = useMemo(() => {
    return completedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  }, [completedOrders]);

  const pendingCount = activeOrders.filter((o: any) => o.status === 'pending').length;

  const handleStatusUpdate = (orderId: string, currentStatus: string) => {
    let nextStatus = 'pending';
    if (currentStatus === 'pending') nextStatus = 'cooking';
    else if (currentStatus === 'cooking') nextStatus = 'served';
    else if (currentStatus === 'served') nextStatus = 'paid';
    
    updateRecord(orderId, { status: nextStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading Kitchen System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-text-primary font-sans selection:bg-accent-yellow/30">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-yellow to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Cha Chaan Teng <span className="text-accent-yellow">LaoBan</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-yellow" />
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span>${dailyRevenue}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowNewOrder(true)}
                className="bg-accent-yellow hover:bg-accent-yellow/90 text-black px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard title="Pending Orders" value={pendingCount} icon={AlertCircle} color="text-orange-500" bg="bg-orange-500/10" border="border-orange-500/20" />
          <MetricCard title="Active Tables" value={`${new Set(activeOrders.map((o: any) => o.tableId)).size} / ${TABLES.length}`} icon={Utensils} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
          <MetricCard title="Orders Served" value={activeOrders.filter((o: any) => o.status === 'served').length} icon={CheckCircle} color="text-green-500" bg="bg-green-500/10" border="border-green-500/20" />
          <MetricCard title="Daily Revenue" value={`$${dailyRevenue}`} icon={TrendingUp} color="text-accent-yellow" bg="bg-accent-yellow/10" border="border-accent-yellow/20" />
        </div>

        <div className="flex items-center gap-4 mb-6 border-b border-gray-800 pb-1">
          <TabButton active={activeTab === 'kitchen'} onClick={() => setActiveTab('kitchen')} icon={ChefHat} label="Kitchen View" />
          <TabButton active={activeTab === 'tables'} onClick={() => setActiveTab('tables')} icon={Utensils} label="Table Map" />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Clock} label="History" />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'kitchen' && (
            <motion.div key="kitchen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                  <Coffee className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg">No active orders</p>
                </div>
              ) : (
                activeOrders.map((order: any) => <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} onDelete={deleteRecord} />)
              )}
            </motion.div>
          )}

          {activeTab === 'tables' && (
             <motion.div key="tables" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {TABLES.map(tableId => {
                  const tableOrders = activeOrders.filter((o: any) => o.tableId === tableId);
                  const isOccupied = tableOrders.length > 0;
                  const hasPending = tableOrders.some((o: any) => o.status === 'pending');
                  return (
                    <div key={tableId} className={cn("aspect-square rounded-xl p-4 flex flex-col justify-between border transition-all cursor-pointer hover:scale-105", isOccupied ? "bg-gray-800 border-gray-700" : "bg-gray-900/50 border-gray-800 hover:border-gray-700 opacity-70")} onClick={() => { if (!isOccupied) setShowNewOrder(true); }}>
                      <div className="flex justify-between items-start">
                         <span className="text-2xl font-bold text-gray-200">{tableId}</span>
                         {isOccupied && <div className={cn("w-3 h-3 rounded-full", hasPending ? "bg-orange-500 animate-pulse" : "bg-green-500")} />}
                      </div>
                      <div className="text-xs text-gray-400">
                        {isOccupied ? (
                          <>
                            <p>{tableOrders.length} orders</p>
                            <p className="text-accent-yellow mt-1">${tableOrders.reduce((s: number, o: any) => s + o.total, 0)}</p>
                          </>
                        ) : "Empty"}
                      </div>
                    </div>
                  );
                })}
             </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Order ID</th>
                      <th className="px-6 py-4 font-medium">Table</th>
                      <th className="px-6 py-4 font-medium">Items</th>
                      <th className="px-6 py-4 font-medium">Total</th>
                      <th className="px-6 py-4 font-medium">Time</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {completedOrders.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No completed orders yet</td></tr>
                    ) : (
                      completedOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-gray-800/50 transition-colors">
                           <td className="px-6 py-4 font-mono text-xs text-gray-500">#{order.id.slice(-4)}</td>
                           <td className="px-6 py-4 font-bold">{order.tableId}</td>
                           <td className="px-6 py-4 text-gray-300 max-w-xs truncate">{order.items}</td>
                           <td className="px-6 py-4 font-medium text-accent-yellow">${order.total}</td>
                           <td className="px-6 py-4 text-gray-400">{format(new Date(order.createdAt), 'HH:mm')}</td>
                           <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">Paid</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onSubmit={(data: any) => { addRecord({ ...data, status: 'pending' }); setShowNewOrder(false); }} />}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, bg, border }: any) {
  return (
    <div className={cn("bg-gray-900/50 backdrop-blur-sm border rounded-xl p-5 flex items-start justify-between", border)}>
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
      </div>
      <div className={cn("p-2 rounded-lg", bg)}><Icon className={cn("w-5 h-5", color)} /></div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", active ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50")}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}

function OrderCard({ order, onStatusUpdate, onDelete }: any) {
  const statusColors: any = { pending: "bg-orange-500/10 text-orange-500 border-orange-500/20", cooking: "bg-blue-500/10 text-blue-500 border-blue-500/20", served: "bg-green-500/10 text-green-500 border-green-500/20", paid: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
  const statusActionLabel: any = { pending: "Start Cooking", cooking: "Serve Order", served: "Mark Paid", paid: "Archive" };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col h-full hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-lg border border-gray-700">{order.tableId}</div>
          <div>
            <div className="flex items-center gap-2"><span className="text-sm text-gray-400">#{order.id.slice(-4)}</span><span className="text-xs text-gray-500">• {format(new Date(order.createdAt), 'HH:mm')}</span></div>
            <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full mt-1 border w-fit", statusColors[order.status])}>{order.status.toUpperCase()}</div>
          </div>
        </div>
        <p className="text-xl font-bold text-accent-yellow">${order.total}</p>
      </div>
      <div className="flex-1 bg-gray-800/50 rounded-lg p-3 mb-4 text-sm text-gray-200 leading-relaxed whitespace-pre-line">{order.items}</div>
      <div className="flex gap-2 mt-auto">
        <button onClick={() => onStatusUpdate(order.id, order.status)} className="flex-1 bg-white text-black hover:bg-gray-200 py-2 rounded-lg text-sm font-medium transition-colors">{statusActionLabel[order.status]}</button>
        <button onClick={() => onDelete(order.id)} className="px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">✕</button>
      </div>
    </div>
  );
}

function NewOrderModal({ onClose, onSubmit }: any) {
  const [tableId, setTableId] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const addToCart = (item: any) => setCart(prev => [...prev, item]);
  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!tableId || cart.length === 0) return;
    const itemCounts = cart.reduce((acc, item) => { acc[item.name] = (acc[item.name] || 0) + 1; return acc; }, {});
    const itemsText = Object.entries(itemCounts).map(([name, count]: any) => count > 1 ? `${count}x ${name}` : name).join('\n');
    onSubmit({ tableId, items: itemsText, total: cartTotal, createdAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-accent-yellow" />New Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-800">
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Table Number</label>
              <div className="flex gap-2 flex-wrap">{TABLES.map(t => <button key={t} onClick={() => setTableId(t)} className={cn("w-10 h-10 rounded-lg text-sm font-bold transition-all", tableId === t ? "bg-accent-yellow text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700")}>{t}</button>)}</div>
            </div>
            <div>
               <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider font-semibold">Menu</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{MENU_ITEMS.map(item => <button key={item.id} onClick={() => addToCart(item)} className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl transition-all text-left group"><div><div className="flex items-center gap-2"><span className="text-xs font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">{item.code}</span><span className="font-medium text-gray-200 group-hover:text-white">{item.name}</span></div></div><span className="text-accent-yellow font-bold">${item.price}</span></button>)}</div>
            </div>
          </div>
          <div className="w-80 bg-gray-900/50 p-6 flex flex-col border-l border-gray-800">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Utensils className="w-4 h-4 text-gray-400" />Current Order</h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">{cart.length === 0 ? <div className="text-center py-10 text-gray-500 text-sm">Select items from the menu</div> : cart.map((item, idx) => <div key={idx} className="flex justify-between items-center text-sm bg-gray-800 p-2 rounded-lg"><span className="truncate flex-1 pr-2">{item.name}</span><div className="flex items-center gap-3"><span className="text-gray-400">${item.price}</span><button onClick={() => removeFromCart(idx)} className="text-gray-500 hover:text-red-400">×</button></div></div>)}</div>
            <div className="border-t border-gray-800 pt-4 mt-auto">
              <div className="flex justify-between items-center mb-4"><span className="text-gray-400">Total</span><span className="text-2xl font-bold text-accent-yellow">${cartTotal}</span></div>
              <button onClick={handleSubmit} disabled={!tableId || cart.length === 0} className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Send to Kitchen</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
