import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { motion } from 'motion/react';

export function Signup() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
            <Sprout className="w-6 h-6 text-emerald-400" />
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-100">
          Create an account
        </motion.h2>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#18181b] py-8 px-4 shadow-2xl shadow-black/50 sm:rounded-2xl sm:px-10 border border-zinc-800 text-center">
          <p className="text-zinc-400 mb-6 text-sm">
            This is a demonstration environment. For the preview, please use the Login page to access the application.
          </p>
          <Link to="/login" className="inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors">
            Go to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
