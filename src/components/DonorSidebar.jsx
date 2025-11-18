import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HomeIcon,
  ChartBarIcon,
  BanknotesIcon,
  FolderIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function DonorSidebar({ collapsed, onToggleCollapse, onNavigate }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const nav = [
    { name: 'Dashboard', href: '/donor', icon: HomeIcon },
    { name: 'Funding', href: '/donor/funding', icon: BanknotesIcon },
    { name: 'Transactions', href: '/donor/transactions', icon: DocumentTextIcon },
    { name: 'Projects', href: '/donor/projects', icon: FolderIcon },
    { name: 'Reports', href: '/donor/documents', icon: ChartBarIcon },
    { name: 'Settings', href: '/donor/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className={`flex min-h-0 flex-1 flex-col sidebar-modern pt-6 ${collapsed ? 'w-20' : 'w-64'} transition-all duration-200`}>
      {/* Brand + Collapse toggle */}
      <div className={`flex h-24 flex-shrink-0 items-center ${collapsed ? 'justify-center px-4' : 'px-6'}`}>
        <div className={`w-full ${collapsed ? 'flex items-center justify-center' : ''}`}>
          <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
            <div className={`h-10 w-10 ${collapsed ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center text-white font-bold bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sm`}>
              <span className="text-sm md:text-base" aria-hidden="true">F</span>
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="text-lg font-extrabold text-gray-900 brand-logo dark:text-slate-100">Fundify</div>
                <div className="text-xs text-gray-500">Funders Portal</div>
              </div>
            )}
            {onToggleCollapse && (
              <div className="ml-auto flex items-center">
                {!collapsed ? (
                  <button type="button" onClick={onToggleCollapse} title="Collapse sidebar" className="ml-3 inline-flex items-center justify-center p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Collapse sidebar">
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button type="button" onClick={onToggleCollapse} title="Expand sidebar" className="ml-3 inline-flex items-center justify-center p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Expand sidebar">
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="flex-1 space-y-2 py-5">
          {nav.map(item => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => { if (onNavigate) onNavigate(); }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.name}
                className={`nav-item group flex items-center ${collapsed ? 'justify-center py-3 text-gray-600 p-2 rounded-full' : `px-3 py-2 rounded-lg text-sm font-medium text-slate-700 transition ${isActive ? 'active-link shadow-sm' : 'hover:bg-gradient-to-r hover:from-sky-50 hover:to-indigo-50 hover:text-sky-600'}`}`}
              >
                {!collapsed && <span className={`h-8 w-1 rounded-r-full mr-3 ${isActive ? 'bg-sky-600' : 'bg-transparent'}`} />}
                <div className={`${collapsed ? 'p-2 rounded-full collapsed-icon' : 'mr-3 p-2 rounded-md bg-white/50 nav-icon'}`}>
                  <item.icon className="h-5 w-5 flex-shrink-0 text-slate-600" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className={`${collapsed ? 'hidden' : 'whitespace-nowrap'}`}>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className={`px-4 py-4 space-y-3 ${collapsed ? 'flex flex-col items-center justify-center' : ''}`}>
        {collapsed ? (
          <button
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-white/90 text-gray-700 hover:bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-100 dark:ring-slate-700"
          >
            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        ) : (
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white/90 text-gray-700 hover:bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-100 dark:ring-slate-700"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            <span className="text-sm">{isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        )}

        {user && (
          collapsed ? (
            <button title="Sign out" onClick={logout} className="w-10 h-10 flex items-center justify-center rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              Sign out
            </button>
          )
        )}
      </div>
    </div>
  );
}
