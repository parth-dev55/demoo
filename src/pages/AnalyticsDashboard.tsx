import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Leaf, CloudRain, Calendar, Activity,
  Sprout, Droplets, Wind, ArrowRight, CheckCircle2, AlertTriangle, MessageSquare, Zap, Target
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { apiService } from '../services/apiService';

// --- INITIAL BASELINE DATA ---
const initialPerformanceData = [
  { month: 'Jan', revenue: 4000, expenses: 2400, yield: 240 },
  { month: 'Feb', revenue: 3000, expenses: 1398, yield: 221 },
  { month: 'Mar', revenue: 9800, expenses: 2000, yield: 229 },
  { month: 'Apr', revenue: 3908, expenses: 2780, yield: 200 },
  { month: 'May', revenue: 4800, expenses: 1890, yield: 218 },
  { month: 'Jun', revenue: 3800, expenses: 2390, yield: 250 },
  { month: 'Jul', revenue: 4300, expenses: 3490, yield: 210 },
];

const initialYieldData = [
  { name: 'Wheat', current: 400, expected: 450 },
  { name: 'Soy', current: 300, expected: 320 },
  { name: 'Cotton', current: 200, expected: 190 },
  { name: 'Corn', current: 278, expected: 290 },
];

const barRadius: [number, number, number, number] = [4, 4, 0, 0];

// --- COMPONENTS ---
interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  glowing?: boolean;
}

function DashboardCard({ title, icon, children, className, action, glowing }: DashboardCardProps) {
  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      className={cn(
        "bg-[#18181b]/80 backdrop-blur-md border rounded-2xl p-5 shadow-xl transition-colors relative overflow-hidden",
        glowing ? "border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-zinc-800/50 hover:border-zinc-700/50",
        className
      )}
    >
      {glowing && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] -z-10 rounded-full" />}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          {icon} {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      {children}
    </motion.div>
  );
}

export function AnalyticsDashboard() {
  const [liveMoisture, setLiveMoisture] = useState(42);
  const [performanceData, setPerformanceData] = useState(initialPerformanceData);
  const [yieldData, setYieldData] = useState(initialYieldData);

  const [tasks, setTasks] = useState([
    { id: 1, task: 'Inspect Field 2 for aphids', time: '08:00 AM', done: true },
    { id: 2, task: 'Fertilizer application (N-P-K)', time: '11:30 AM', done: false },
    { id: 3, task: 'Meeting with buyer (AgroCorp)', time: '02:00 PM', done: false },
    { id: 4, task: 'Irrigation cycle (Field 3)', time: '06:00 PM', done: false },
  ]);
  const [showReport, setShowReport] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);

  // Fetch real analytics from FastAPI backend
  useEffect(() => {
    let mounted = true;
    apiService.getAnalytics('farm-demo-01').then((res) => {
      if (mounted && res && res.available) {
        if (res.performance_monthly && res.performance_monthly.length > 0) {
          setPerformanceData(res.performance_monthly);
        }
        if (res.yield_trends && res.yield_trends.length > 0) {
          setYieldData(res.yield_trends);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Simulate real-time sensor data
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMoisture(prev => Math.max(30, Math.min(60, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-thin relative">
      {/* MODALS */}
      {showReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
          >
            <button onClick={() => setShowReport(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" /> Executive Farm Report
            </h2>
            <div className="space-y-4 text-sm text-zinc-300">
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-emerald-400">Key Metrics</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Monthly Revenue is up 12.5%</li>
                  <li>Overall Crop Health stands at 92/100</li>
                  <li>Live moisture levels are optimal around {liveMoisture}%</li>
                </ul>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-emerald-400">Task Completion</h3>
                <p>You have completed {tasks.filter(t => t.done).length} out of {tasks.length} tasks scheduled for today.</p>
              </div>
            </div>
            <button onClick={() => setShowReport(false)} className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded-lg transition-colors">
              Close Report
            </button>
          </motion.div>
        </div>
      )}

      {showActionPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#18181b] border border-emerald-500/30 rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[0_0_20px_rgba(16,185,129,0.15)] relative"
          >
            <button onClick={() => setShowActionPlan(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-500" /> AI Action Plan
            </h2>
            <div className="space-y-4 text-sm text-zinc-300">
              <p className="text-zinc-400">Based on real-time telemetry and market conditions, here are the AI-recommended actions:</p>
              
              <div className="space-y-3">
                <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-3 flex gap-3">
                  <div className="mt-0.5"><Droplets className="w-4 h-4 text-emerald-500" /></div>
                  <div>
                    <h4 className="font-semibold text-emerald-400">Urgent: Irrigation Cycle</h4>
                    <p className="text-zinc-400 mt-1">Field 3 moisture is dropping. Initiate 45-minute drip cycle tonight at 20:00 to prevent yield loss.</p>
                  </div>
                </div>
                
                <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 flex gap-3">
                  <div className="mt-0.5"><TrendingUp className="w-4 h-4 text-amber-500" /></div>
                  <div>
                    <h4 className="font-semibold text-amber-400">Opportunity: Sell Wheat</h4>
                    <p className="text-zinc-400 mt-1">Wheat prices surged 2.4% today. Recommend selling 20% of stored inventory within 48 hours.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowActionPlan(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors">
                Apply Plan
              </button>
              <button onClick={() => setShowActionPlan(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded-lg transition-colors">
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">Farm Command Center</h1>
            <p className="text-sm text-zinc-400 mt-1">Real-time telemetry, AI insights, and operational analytics.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-copilot', {
                  detail: { prompt: "Analyze my farm's current yield, revenue trends, and water usage efficiency for this season." }
                }));
              }}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" /> Ask AgriGPT
            </button>

            <button 
              onClick={() => setShowReport(true)}
              className="px-4 py-2 bg-zinc-800 text-zinc-200 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Generate Report
            </button>
            <button 
              onClick={() => setShowActionPlan(true)}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> AI Action Plan
            </button>
          </motion.div>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          animate="show"
        >
          {/* ROW 1: KPIs */}
          <DashboardCard title="Financial Overview" icon={<DollarSign className="w-4 h-4 text-emerald-400" />}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">$45,231</p>
                <p className="text-xs text-emerald-400 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1"/> +12.5%</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-medium">Profit Margin</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">32.4%</p>
                <p className="text-xs text-emerald-400 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1"/> +2.1%</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
              <span className="text-xs text-zinc-400">Total Expenses</span>
              <span className="text-sm font-semibold text-zinc-200">$30,580</span>
            </div>
          </DashboardCard>

          <DashboardCard title="Farm Health & Sustain" icon={<Activity className="w-4 h-4 text-blue-400" />}>
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-3xl font-bold text-zinc-100">92<span className="text-lg text-zinc-500">/100</span></p>
                <p className="text-xs text-zinc-400 mt-1">Overall Crop Health</p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
              <span className="text-xs text-zinc-400">Sustainability Score</span>
              <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1"><Leaf className="w-3 h-3"/> A+ Rating</span>
            </div>
          </DashboardCard>

          <DashboardCard title="Live Environment" icon={<CloudRain className="w-4 h-4 text-cyan-400" />}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-zinc-100">28°C</p>
                <p className="text-xs text-zinc-400 mt-1">Partly Cloudy</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-200 flex items-center justify-end gap-1"><Droplets className="w-3 h-3 text-blue-400"/> 65%</p>
                <p className="text-sm font-semibold text-zinc-200 flex items-center justify-end gap-1 mt-1"><Wind className="w-3 h-3 text-teal-400"/> 12km/h</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center group">
              <span className="text-xs text-zinc-400">Soil Moisture (Sensor A1)</span>
              <span className="text-sm font-bold text-blue-400 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                {liveMoisture}%
              </span>
            </div>
          </DashboardCard>

          <DashboardCard title="AI Copilot Suggestion" icon={<Zap className="w-4 h-4 text-amber-400" />} glowing={true}>
            <p className="text-sm text-zinc-200 leading-relaxed">
              <span className="font-semibold text-emerald-400">Action Required:</span> Soil moisture in Field 3 is dropping faster than expected. Recommend initiating irrigation cycle tonight to optimize water usage.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-semibold py-2 rounded-lg transition-colors border border-emerald-500/20">
                Start Irrigation
              </button>
              <button className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold py-2 rounded-lg transition-colors">
                Ask AI Why
              </button>
            </div>
          </DashboardCard>

          {/* ROW 2: Charts & Wide Data */}
          <DashboardCard title="Revenue vs Expenses (YTD)" icon={<BarChart className="w-4 h-4 text-purple-400" />} className="xl:col-span-3">
            <div className="h-[280px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>

          <DashboardCard title="Quick Actions" icon={<Target className="w-4 h-4 text-rose-400" />} className="xl:col-span-1">
            <div className="grid grid-cols-2 gap-3 h-full pb-4">
              <button className="bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                <MessageSquare className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-medium text-zinc-300">New Chat</span>
              </button>
              <button className="bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                <Sprout className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-medium text-zinc-300">Scan Crop</span>
              </button>
              <button className="bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                <DollarSign className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-medium text-zinc-300">Buy/Sell</span>
              </button>
              <button className="bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                <Calendar className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-medium text-zinc-300">Schedule</span>
              </button>
            </div>
          </DashboardCard>

          {/* ROW 3 */}
          <DashboardCard title="Yield Prediction (tons)" icon={<Sprout className="w-4 h-4 text-emerald-400" />} className="xl:col-span-2">
             <div className="h-[200px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#18181b'}} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#f4f4f5' }} />
                  <Bar dataKey="current" fill="#3f3f46" radius={barRadius} name="Current Yield" />
                  <Bar dataKey="expected" fill="#10b981" radius={barRadius} name="Predicted Yield" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>

          <DashboardCard title="Market Prices" icon={<TrendingUp className="w-4 h-4 text-blue-400" />}>
            <div className="space-y-4 mt-2">
              {[
                { name: 'Wheat (Grade A)', price: '$400/t', trend: '+2.4%', up: true },
                { name: 'Soybean', price: '$650/t', trend: '+1.2%', up: true },
                { name: 'Cotton', price: '$1,200/t', trend: '-0.8%', up: false },
                { name: 'Corn', price: '$290/t', trend: '+0.5%', up: true },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center pb-3 border-b border-zinc-800/50 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-zinc-300">{item.name}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-100">{item.price}</div>
                    <div className={cn("text-xs flex items-center justify-end gap-1", item.up ? "text-emerald-400" : "text-red-400")}>
                      {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {item.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Today's Tasks" icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}>
            <div className="space-y-3 mt-2">
              {tasks.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => toggleTask(item.id)}
                >
                  <div className={cn("mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-emerald-500/50", item.done ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "border-zinc-600")}>
                    {item.done && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium transition-colors group-hover:text-zinc-300", item.done ? "text-zinc-500 line-through" : "text-zinc-200")}>{item.task}</p>
                    <p className="text-xs text-zinc-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

        </motion.div>
      </div>
    </div>
  );
}
