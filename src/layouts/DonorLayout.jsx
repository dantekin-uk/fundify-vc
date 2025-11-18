import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { BellIcon, ChevronDownIcon, MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import DonorSidebar from '../components/DonorSidebar';
import { AnimatePresence, motion } from 'framer-motion';

export default function DonorLayout() {
  const { user, logout } = useAuth();
  const { byFunder } = useFinance();
  const [showMenu, setShowMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem('donor_sidebar_collapsed') === '1'; } catch { return false; }
  }); // desktop
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (!menuRef.current) return; if (!menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Persist desktop collapsed state
  useEffect(() => {
    try { localStorage.setItem('donor_sidebar_collapsed', desktopCollapsed ? '1' : '0'); } catch {}
  }, [desktopCollapsed]);

  // Breadcrumbs from current path
  const breadcrumbs = (() => {
    const path = location.pathname.replace(/\/+$/, '');
    const segs = path.split('/').filter(Boolean);
    const items = [];
    const mapLabel = (seg, idx, all) => {
      if (seg === 'donor') return 'Donor';
      if (seg === 'dashboard') return 'Dashboard';
      if (seg === 'funding') return 'Funding Overview';
      if (seg === 'transactions') return 'Transactions';
      if (seg === 'projects') return 'Projects';
      if (seg === 'documents') return 'Documents & Reports';
      if (seg === 'settings') return 'Settings';
      // project id -> details
      if (all[idx-1] === 'projects') return 'Details';
      return seg;
    };
    let acc = '';
    segs.forEach((seg, idx) => {
      acc += '/' + seg;
      items.push({ href: acc, label: mapLabel(seg, idx, segs) });
    });
    // Only keep donor subtree
    return items.filter(i => i.href.startsWith('/donor'));
  })();

  const me = byFunder.find(f => f?.funder?.contact === user?.email) || byFunder[0] || null;
  const funderId = me?.funder?.id || 'me';

  const item = (to, label, exact=false) => (
    <Link to={to} className={`block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${location.pathname === to || (!exact && location.pathname.startsWith(to)) ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{label}</Link>
  );

  return (
    <div className="min-h-screen bg-neutral-base overflow-x-hidden dark:bg-[#0b1220] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:z-50 lg:rounded-tr-2xl lg:rounded-br-2xl lg:shadow-xl lg:overflow-hidden transition-all duration-200 ${desktopCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <DonorSidebar collapsed={desktopCollapsed} onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)} />
      </div>

      {/* Main area */}
      <div className={`${desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'} min-h-screen flex flex-col`}>        
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white/70 backdrop-blur border-b border-slate-200 dark:bg-slate-900/60 dark:border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu */}
            <button className="lg:hidden p-2 rounded-md ring-1 ring-slate-200 dark:ring-slate-700" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <span className="block h-4 w-4 bg-slate-600 dark:bg-slate-300" style={{maskImage:'url(data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'><path fill=\'currentColor\' d=\'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z\'/></svg>)', WebkitMaskImage:'url(data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'><path fill=\'currentColor\' d=\'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z\'/></svg>)'}} />
            </button>
            
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              <input className="bg-transparent text-sm outline-none placeholder:text-slate-400 w-56" placeholder="Search (projects, transactions)" />
            </div>
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Notifications">
              <BellIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(v=>!v)} className="flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
                <UserCircleIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{user?.name || user?.email || 'Profile'}</span>
                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-lg shadow ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
                  <button onClick={logout} className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content with animated page transitions */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div className={`lg:hidden ${sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-0 z-50 flex">
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-slate-900">
            <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
              <nav className="mt-5 space-y-1 px-2">
                <DonorSidebar collapsed={false} onNavigate={() => setSidebarOpen(false)} />
              </nav>
            </div>
          </div>
          <div className="w-14 flex-shrink-0"></div>
        </div>
      </div>
    </div>
  );
}
