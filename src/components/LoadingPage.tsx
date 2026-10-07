import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sprout, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  Radio, 
  ChevronRight, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  BarChart2, 
  Globe, 
  ArrowRight,
  ChevronLeft,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SYSTEM_STAGES = [
  { id: 1, title: 'Initializing Core Neural Engine', desc: 'Loading AgriGPT multi-modal AI models', icon: Cpu },
  { id: 2, title: 'Connecting AgriGPT AI Engine', desc: 'Establishing secure high-throughput inference channel', icon: Sparkles },
  { id: 3, title: 'Syncing Satellite & Soil Telemetry', desc: 'Fetching micro-climate weather & NPK soil metrics', icon: Globe },
  { id: 4, title: 'Calibrating Crop Analytics OS', desc: 'Building personalized yield optimization models', icon: BarChart2 },
];

const FARMING_TIPS = [
  {
    category: "Irrigation Efficiency",
    tip: "Drip irrigation reduces water waste by up to 50% compared to traditional flood methods while promoting deeper root structures.",
    stat: "+35% Yield Efficiency"
  },
  {
    category: "Soil Health & Nitrogen",
    tip: "Rotating legumes (e.g. chickpeas, soybeans) restores soil nitrogen naturally, reducing synthetic fertilizer costs by up to 30%.",
    stat: "30% Lower Fertilizer Cost"
  },
  {
    category: "Pest & Disease Prevention",
    tip: "Early leaf spot diagnosis using AI multispectral imaging prevents crop-wide infestations up to 14 days before visible damage.",
    stat: "98% Early Detection Rate"
  },
  {
    category: "Yield Optimization",
    tip: "Monitoring soil temperature above 18°C prior to sowing maximizes germinating efficiency for summer cereal crops.",
    stat: "Optimized Sowing Windows"
  },
  {
    category: "Precision Farming",
    tip: "Variable rate fertilization applies nutrients only where needed based on canopy reflectance index, protecting groundwater.",
    stat: "Eco-Friendly Operations"
  }
];

interface LoadingPageProps {
  onComplete?: () => void;
  standalone?: boolean;
  autoRedirect?: boolean;
  targetPath?: string;
}

function useSafeNavigate() {
  try {
    return useNavigate();
  } catch {
    return (path: string) => {
      window.location.href = path;
    };
  }
}

export function LoadingPage({ 
  onComplete, 
  standalone = false, 
  autoRedirect = true,
  targetPath = '/' 
}: LoadingPageProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [latency] = useState(() => Math.floor(10 + Math.random() * 15));
  const navigate = useSafeNavigate();

  // Progress simulation algorithm
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (progress < 100) {
      const increment = Math.floor(Math.random() * 8) + 4;
      const speed = Math.floor(Math.random() * 120) + 80;

      timer = setTimeout(() => {
        setProgress(prev => {
          const next = Math.min(100, prev + increment);
          
          // Calculate active step based on progress
          if (next >= 85) setCurrentStepIndex(3);
          else if (next >= 60) setCurrentStepIndex(2);
          else if (next >= 30) setCurrentStepIndex(1);
          else setCurrentStepIndex(0);

          if (next === 100) {
            setIsCompleted(true);
          }
          return next;
        });
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [progress]);

  // Handle completion trigger
  useEffect(() => {
    if (isCompleted && autoRedirect) {
      const redirectTimer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else if (standalone) {
          navigate(targetPath);
        }
      }, 1200);
      return () => clearTimeout(redirectTimer);
    }
  }, [isCompleted, autoRedirect, onComplete, standalone, navigate, targetPath]);

  // Tip rotation ticker
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % FARMING_TIPS.length);
    }, 4000);
    return () => clearInterval(tipInterval);
  }, []);

  const handleReset = () => {
    setProgress(0);
    setCurrentStepIndex(0);
    setIsCompleted(false);
  };

  const currentTip = FARMING_TIPS[currentTipIndex];

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-zinc-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Sprout className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              AgriGPT OS
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                v2.5 Pro
              </span>
            </div>
            <div className="text-xs text-zinc-400">Smart Farming AI Engine</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800/80 px-3 py-1.5 rounded-lg">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{latency}ms latency</span>
          </div>
          {standalone && (
            <button
              onClick={() => navigate('/')}
              className="text-xs text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Skip to App
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Center Content Container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto my-auto py-8 flex flex-col items-center text-center">
        
        {/* Animated Brand Pulse / Orbital Graphic */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer Pulsing Aura Rings */}
          <motion.div 
            animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-44 h-44 rounded-full bg-emerald-500/20 blur-xl"
          />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute w-36 h-36 rounded-full border border-dashed border-emerald-500/30"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute w-28 h-28 rounded-full border border-zinc-800 border-t-emerald-400/60"
          />

          {/* Central Glowing Shield Icon */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]">
            <motion.div
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sprout className="w-10 h-10 text-emerald-400" />
            </motion.div>
          </div>
        </div>

        {/* Main Status Text */}
        <motion.div 
          key={currentStepIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
            {SYSTEM_STAGES[currentStepIndex].title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            {SYSTEM_STAGES[currentStepIndex].desc}
          </p>
        </motion.div>

        {/* Progress Bar & Percentage display */}
        <div className="w-full max-w-md mt-6 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono font-medium text-zinc-400 px-0.5">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              {isCompleted ? 'System Ready' : 'Processing Neural Weights...'}
            </span>
            <span className="text-zinc-200 font-bold text-sm">{progress}%</span>
          </div>

          {/* Progress Bar Container */}
          <div className="h-2.5 w-full bg-zinc-900/90 border border-zinc-800 rounded-full overflow-hidden p-0.5 relative">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)] relative"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </motion.div>
          </div>
        </div>

        {/* Modular Initialization Milestones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mt-8">
          {SYSTEM_STAGES.map((stage, idx) => {
            const isDone = progress >= (idx + 1) * 25 || isCompleted;
            const isCurrent = currentStepIndex === idx && !isCompleted;
            const StageIcon = stage.icon;

            return (
              <div 
                key={stage.id}
                className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                  isDone 
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                    : isCurrent 
                    ? 'bg-zinc-800/80 border-emerald-500/60 text-zinc-100 ring-1 ring-emerald-500/30' 
                    : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <StageIcon className={`w-4 h-4 ${isDone ? 'text-emerald-400' : isCurrent ? 'text-emerald-300 animate-pulse' : 'text-zinc-600'}`} />
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-zinc-700" />
                  )}
                </div>
                <div className="text-[11px] font-semibold tracking-tight truncate">{stage.title}</div>
                <div className="text-[9px] opacity-70 mt-0.5 truncate">{isDone ? 'Ready' : isCurrent ? 'Loading...' : 'Pending'}</div>
              </div>
            );
          })}
        </div>

        {/* Complete State Action Buttons */}
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={() => {
                if (onComplete) onComplete();
                else navigate(targetPath);
              }}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              Enter AgriGPT Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replay Loading
            </button>
          </motion.div>
        )}
      </div>

      {/* Bottom Agronomy Knowledge Card Ticker */}
      <div className="relative z-10 w-full max-w-4xl mx-auto mt-auto pt-4">
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Info className="w-4 h-4 text-emerald-400" />
              Smart Agriculture Insight #{currentTipIndex + 1}
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentTipIndex(prev => (prev - 1 + FARMING_TIPS.length) % FARMING_TIPS.length)}
                className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title="Previous Tip"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentTipIndex(prev => (prev + 1) % FARMING_TIPS.length)}
                className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title="Next Tip"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full inline-block">
                  {currentTip.category}
                </span>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                  "{currentTip.tip}"
                </p>
              </div>
              <div className="self-start sm:self-center shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg">
                {currentTip.stat}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer copyright / badge */}
        <div className="text-center text-[11px] text-zinc-500 mt-3 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Powered by AgriGPT AI Engine • Encrypted & Secure Session</span>
        </div>
      </div>
    </div>
  );
}
