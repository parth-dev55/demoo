import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CartDrawer } from './CartDrawer';
import { CopilotDrawer } from './CopilotDrawer';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#09090b] overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
      <CartDrawer />
      <CopilotDrawer />
    </div>
  );
}
