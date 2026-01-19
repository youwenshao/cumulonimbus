import { ParsedIntent, ProbeQuestion, ImplementationPlan } from '@/lib/scaffolder/types';
import { GeneratedCode } from '@/lib/scaffolder/code-generator';

export type SimulationEventType = 'thinking' | 'tool_call' | 'web_search' | 'code_generation' | 'message';

export interface SimulationEvent {
  type: SimulationEventType;
  content: string;
  metadata?: any;
  delay?: number; // ms to wait before next event
}

import type { ProjectSpec } from '@/lib/scaffolder/types';

export interface DemoScenario {
  id: string;
  name: string;
  trigger: RegExp;
  intent: ParsedIntent;
  questions: ProbeQuestion[];
  plan: ImplementationPlan;
  spec: ProjectSpec;
  code: GeneratedCode;
  timeline: SimulationEvent[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'chachaanteng-tracker',
    name: 'Cha Chaan Teng Order Tracker',
    trigger: /cha chaan teng|restaurant|order|food/i,
    intent: {
      category: 'custom',
      entities: ['orders', 'menu items', 'tables'],
      actions: ['track', 'manage', 'calculate'],
      relationships: ['orders belong to tables'],
      suggestedName: 'Cha Chaan Teng LaoBan',
      confidence: 0.99,
    },
    questions: [
      {
        id: 'staff-role',
        question: 'Who will be using this system primarily?',
        type: 'single',
        category: 'logic',
        options: [
          { id: 'waiter', label: 'Waiters/Floor Staff', description: 'Optimized for quick order entry on mobile/tablet' },
          { id: 'kitchen', label: 'Kitchen/Chef', description: 'Large display with focus on order status and priority' },
          { id: 'manager', label: 'Manager/Owner', description: 'Reports, revenue tracking and menu management' }
        ],
        answered: false
      },
      {
        id: 'features',
        question: 'Which specialized cha chaan teng features do you need?',
        type: 'multiple',
        category: 'ui',
        options: [
          { id: 'codes', label: 'Shorthand Codes', description: 'Support for classic codes like OT (Iced Lemon Tea)' },
          { id: 'table-map', label: 'Table Map', description: 'Visual layout of the restaurant tables' },
          { id: 'bill-split', label: 'Easy Bill Splitting', description: 'Quickly split bills among customers' },
          { id: 'kitchen-print', label: 'Kitchen Ticket Printing', description: 'Automatically generate tickets for the kitchen' }
        ],
        answered: false
      }
    ],
    plan: {
      overview: 'Build a specialized order management system for Hong Kong tea restaurants with mobile-optimized interface, real-time status updates, and traditional Cha Chaan Teng workflows.',
      architecture: {
        primitives: ['Table management', 'Order lifecycle', 'Menu system', 'Status tracking'],
        dataFlow: 'Orders flow from table assignment → menu selection → kitchen → payment'
      },
      components: {
        form: {
          name: 'OrderForm',
          type: 'mobile-form',
          description: 'Touch-optimized order input with shorthand codes and quick-add buttons'
        },
        views: [
          {
            name: 'KitchenView',
            type: 'status-board',
            description: 'Real-time order status display with one-tap status updates'
          },
          {
            name: 'TableView',
            type: 'table-layout',
            description: 'Visual table map showing occupancy and order status'
          }
        ]
      },
      steps: [
        'Design mobile-first order entry interface',
        'Implement table management with visual layout',
        'Create order status workflow (pending → cooking → served → paid)',
        'Add menu system with shorthand codes',
        'Build kitchen display with status controls'
      ],
      estimatedComplexity: 'moderate'
    },
    spec: {
      name: 'Cha Chaan Teng LaoBan',
      description: 'A specialized order management system for a Hong Kong style tea restaurant.',
      category: 'custom',
      dataStore: {
        name: 'orders',
        label: 'Orders',
        fields: [
          {
            name: 'id',
            label: 'ID',
            type: 'text',
            required: true,
          },
          {
            name: 'tableId',
            label: 'Table Number',
            type: 'text',
            required: true,
          },
          {
            name: 'items',
            label: 'Order Items',
            type: 'text',
            required: true,
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: ['pending', 'cooking', 'served', 'paid'],
            required: true,
          },
          {
            name: 'total',
            label: 'Total Amount',
            type: 'number',
            required: true,
          },
          {
            name: 'timestamp',
            label: 'Order Time',
            type: 'date',
            required: false,
          }
        ]
      },
      views: [
        {
          type: 'table',
          title: 'Active Orders',
          config: {
            columns: ['tableId', 'items', 'status', 'total'],
            sortBy: 'timestamp',
            sortOrder: 'desc'
          }
        }
      ],
      features: {
        allowEdit: true,
        allowDelete: true,
        allowExport: false
      }
    },
    timeline: [
      {
        type: 'thinking',
        content: 'Analyzing request for "Cha Chaan Teng" (Hong Kong Tea Restaurant) context...',
        delay: 800
      },
      {
        type: 'thinking',
        content: 'Identifying key domain requirements: Speed, shorthand codes (e.g., OT for Lemon Tea), table management, and bill calculation.',
        delay: 1200
      },
      {
        type: 'web_search',
        content: 'classic cha chaan teng menu items list hong kong',
        delay: 1500,
        metadata: {
          results: [
            'Pineapple Bun with Butter (Bo Lo Yau)',
            'Hong Kong Style Milk Tea (Nai Cha)',
            'Baked Pork Chop Rice',
            'Satay Beef Noodles'
          ]
        }
      },
      {
        type: 'thinking',
        content: 'Retrieved popular menu items. Structuring data model for Orders with support for modifications (e.g., "Less Sweet", "Iced").',
        delay: 1000
      },
      {
        type: 'tool_call',
        content: 'Generating component structure...',
        metadata: { tool: 'architect_agent', input: '{ component: "OrderTable" }' },
        delay: 1500
      },
      {
        type: 'message',
        content: 'I\'m building a specialized tracker for your Cha Chaan Teng. I\'ve included a pre-loaded menu with classics like **Milk Tea** and **Pineapple Buns**, plus a quick-add interface for high-volume periods.',
        delay: 500
      },
      {
        type: 'code_generation',
        content: 'generating_code', // Special flag to trigger code streaming
        delay: 3000
      }
    ],
    code: {
      types: '', // Not used in freeform
      pageComponent: `
import React, { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils'; // Assuming cn is available globally via bundle or we inline it
// Note: In real generation, we use imports that are available. 
// For this seeded demo, we assume the environment provides these or we simulate them.

// --- Menu Data ---
const MENU_CATEGORIES = [
  { id: 'set', name: 'Set Meals' },
  { id: 'rice', name: 'Rice/Noodles' },
  { id: 'drink', name: 'Drinks' },
  { id: 'snack', name: 'Snacks' },
];

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

function App() {
  const { data: orders, addRecord, updateRecord, deleteRecord, isLoading } = useAppData();
  const [activeTab, setActiveTab] = useState('kitchen');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter orders based on active tab/view
  const activeOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => o.status !== 'paid').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const completedOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => o.status === 'paid');
  }, [orders]);

  // Metrics
  const dailyRevenue = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [completedOrders]);

  const pendingCount = activeOrders.filter(o => o.status === 'pending').length;

  const handleStatusUpdate = (orderId, currentStatus) => {
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
      {/* Top Navigation Bar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-yellow to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <div>
                <                h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  Cha Chaan Teng <span className="text-accent-yellow">LaoBan</span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-yellow" />
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span>\${dailyRevenue}</span>
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
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard 
            title="Pending Orders" 
            value={pendingCount} 
            icon={AlertCircle} 
            color="text-orange-500" 
            bg="bg-orange-500/10"
            border="border-orange-500/20"
          />
          <MetricCard 
            title="Active Tables" 
            value={\`\${new Set(activeOrders.map(o => o.tableId)).size} / \${TABLES.length}\`} 
            icon={Utensils} 
            color="text-blue-500" 
            bg="bg-blue-500/10"
            border="border-blue-500/20"
          />
          <MetricCard 
            title="Orders Served" 
            value={activeOrders.filter(o => o.status === 'served').length} 
            icon={CheckCircle} 
            color="text-green-500" 
            bg="bg-green-500/10"
            border="border-green-500/20"
          />
          <MetricCard 
            title="Daily Revenue" 
            value={\`\$\${dailyRevenue}\`} 
            icon={TrendingUp} 
            color="text-accent-yellow" 
            bg="bg-accent-yellow/10"
            border="border-accent-yellow/20"
          />
        </div>

        {/* Main Content View Switcher */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-800 pb-1">
          <TabButton active={activeTab === 'kitchen'} onClick={() => setActiveTab('kitchen')} icon={ChefHat} label="Kitchen View" />
          <TabButton active={activeTab === 'tables'} onClick={() => setActiveTab('tables')} icon={Utensils} label="Table Map" />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Clock} label="History" />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'kitchen' && (
            <motion.div 
              key="kitchen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Order Cards */}
              {activeOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                  <Coffee className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg">No active orders</p>
                  <p className="text-sm">Wait for new customers or create an order</p>
                </div>
              ) : (
                activeOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onStatusUpdate={handleStatusUpdate}
                    onDelete={deleteRecord}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'tables' && (
             <motion.div
              key="tables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
             >
                {TABLES.map(tableId => {
                  const tableOrders = activeOrders.filter(o => o.tableId === tableId);
                  const isOccupied = tableOrders.length > 0;
                  const hasPending = tableOrders.some(o => o.status === 'pending');
                  
                  return (
                    <div 
                      key={tableId}
                      className={cn(
                        "aspect-square rounded-xl p-4 flex flex-col justify-between border transition-all cursor-pointer hover:scale-105",
                        isOccupied 
                          ? "bg-gray-800 border-gray-700" 
                          : "bg-gray-900/50 border-gray-800 hover:border-gray-700 opacity-70"
                      )}
                      onClick={() => {
                        // In a real app, this would filter orders or open table details
                        if (!isOccupied) {
                          setShowNewOrder(true);
                          // We could pre-fill tableId here
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                         <span className="text-2xl font-bold text-gray-200">{tableId}</span>
                         {isOccupied && (
                           <div className={cn(
                             "w-3 h-3 rounded-full",
                             hasPending ? "bg-orange-500 animate-pulse" : "bg-green-500"
                           )} />
                         )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {isOccupied ? (
                          <>
                            <p>{tableOrders.length} orders</p>
                            <p className="text-accent-yellow mt-1">\${tableOrders.reduce((s, o) => s + o.total, 0)}</p>
                          </>
                        ) : (
                          "Empty"
                        )}
                      </div>
                    </div>
                  );
                })}
             </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden"
            >
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
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No completed orders yet</td>
                      </tr>
                    ) : (
                      completedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-800/50 transition-colors">
                           <td className="px-6 py-4 font-mono text-xs text-gray-500">#{order.id.slice(-4)}</td>
                           <td className="px-6 py-4 font-bold">{order.tableId}</td>
                           <td className="px-6 py-4 text-gray-300 max-w-xs truncate">{order.items}</td>
                           <td className="px-6 py-4 font-medium text-accent-yellow">\${order.total}</td>
                           <td className="px-6 py-4 text-gray-400">{format(new Date(order.createdAt), 'HH:mm')}</td>
                           <td className="px-6 py-4">
                             <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                               Paid
                             </span>
                           </td>
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

      {/* New Order Modal */}
      <AnimatePresence>
        {showNewOrder && (
          <NewOrderModal 
            onClose={() => setShowNewOrder(false)} 
            onSubmit={(data) => {
              addRecord({
                ...data,
                status: 'pending',
                total: data.total, // Calculated in modal
              });
              setShowNewOrder(false);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subcomponents ---

function MetricCard({ title, value, icon: Icon, color, bg, border }) {
  return (
    <div className={cn("bg-gray-900/50 backdrop-blur-sm border rounded-xl p-5 flex items-start justify-between", border)}>
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
      </div>
      <div className={cn("p-2 rounded-lg", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active 
          ? "bg-gray-800 text-white shadow-sm" 
          : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function OrderCard({ order, onStatusUpdate, onDelete }) {
  const statusColors = {
    pending: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    cooking: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    served: "bg-green-500/10 text-green-500 border-green-500/20",
    paid: "bg-gray-500/10 text-gray-400 border-gray-500/20"
  };

  const statusActionLabel = {
    pending: "Start Cooking",
    cooking: "Serve Order",
    served: "Mark Paid",
    paid: "Archive"
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col h-full hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-lg border border-gray-700">
            {order.tableId}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">#{order.id.slice(-4)}</span>
              <span className="text-xs text-gray-500">• {format(new Date(order.createdAt), 'HH:mm')}</span>
            </div>
            <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full mt-1 border w-fit", statusColors[order.status])}>
              {order.status.toUpperCase()}
            </div>
          </div>
        </div>
        <p className="text-xl font-bold text-accent-yellow">\${order.total}</p>
      </div>
      
      <div className="flex-1 bg-gray-800/50 rounded-lg p-3 mb-4 text-sm text-gray-200 leading-relaxed whitespace-pre-line">
        {order.items}
      </div>

      <div className="flex gap-2 mt-auto">
        <button 
          onClick={() => onStatusUpdate(order.id, order.status)}
          className="flex-1 bg-white text-black hover:bg-gray-200 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {statusActionLabel[order.status]}
        </button>
        <button 
          onClick={() => onDelete(order.id)}
          className="px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <span className="sr-only">Cancel</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function NewOrderModal({ onClose, onSubmit }) {
  const [tableId, setTableId] = useState('');
  const [cart, setCart] = useState([]);
  
  const addToCart = (item) => {
    setCart(prev => [...prev, item]);
  };
  
  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };
  
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tableId || cart.length === 0) return;
    
    // Group items for display
    const itemCounts = cart.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + 1;
      return acc;
    }, {});
    
    const itemsText = Object.entries(itemCounts)
      .map(([name, count]) => count > 1 ? \`\${count}x \${name}\` : name)
      .join('\\n');
      
    onSubmit({
      tableId,
      items: itemsText,
      total: cartTotal,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent-yellow" />
            New Order
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Menu Selection */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-800">
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Table Number</label>
              <div className="flex gap-2 flex-wrap">
                {TABLES.map(t => (
                  <button 
                    key={t}
                    onClick={() => setTableId(t)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-sm font-bold transition-all",
                      tableId === t 
                        ? "bg-accent-yellow text-black" 
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
               <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider font-semibold">Menu</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {MENU_ITEMS.map(item => (
                   <button
                     key={item.id}
                     onClick={() => addToCart(item)}
                     className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl transition-all text-left group"
                   >
                     <div>
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">{item.code}</span>
                         <span className="font-medium text-gray-200 group-hover:text-white">{item.name}</span>
                       </div>
                     </div>
                     <span className="text-accent-yellow font-bold">\${item.price}</span>
                   </button>
                 ))}
               </div>
            </div>
          </div>

          {/* Cart / Summary */}
          <div className="w-80 bg-gray-900/50 p-6 flex flex-col border-l border-gray-800">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-gray-400" />
              Current Order
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  Select items from the menu
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm bg-gray-800 p-2 rounded-lg">
                    <span className="truncate flex-1 pr-2">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">\${item.price}</span>
                      <button onClick={() => removeFromCart(idx)} className="text-gray-500 hover:text-red-400">×</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-800 pt-4 mt-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400">Total</span>
                <span className="text-2xl font-bold text-accent-yellow">\${cartTotal}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!tableId || cart.length === 0}
                className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send to Kitchen
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
`
    }
  }
];
