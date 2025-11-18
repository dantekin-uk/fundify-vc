import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { useFinance } from '../context/FinanceContext';
import {
  HomeIcon,
  BanknotesIcon,
  WalletIcon,
  ChartBarIcon,
  UsersIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
  IdentificationIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  HeartIcon,
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

const Sidebar = ({ collapsed, onToggleCollapse, onNavigate }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { role } = useOrg();
  const { expenses, incomes, funders } = useFinance();
  const { isDark, toggleTheme } = useTheme();

  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (name) => {
    setOpenGroups(prev => ({
      ...Object.keys(prev).reduce((acc, key) => {
        acc[key] = false; // Close all groups first
        return acc;
      }, {}),
      [name]: !prev[name] // Toggle the clicked group
    }));
  };

  // Close all groups when a non-group item is clicked
  const closeAllGroups = () => {
    setOpenGroups(prev => ({
      ...Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {})
    }));
  };

  const pendingCount = ((expenses || []).filter((e) => e.status === 'pending').length) +
                      ((incomes || []).filter((i) => i.status === 'pending').length);

  // Role-based navigation items
  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/app/dashboard/overview', icon: HomeIcon, roles: ['admin', 'donor'] },
      { name: 'Income', href: '/app/income', icon: BanknotesIcon, roles: ['admin'] },
      { name: 'Expenses', href: '/app/expenses', icon: WalletIcon, roles: ['admin'] },
      { name: 'Reports', href: '/app/reports', icon: ChartBarIcon, roles: ['admin', 'donor'] },
      {
        name: 'Funders', icon: null, roles: ['admin'],
        children: [
          { name: 'Add Funder', href: '/app/funders/add', icon: PlusIcon, roles: ['admin'] },
          { name: 'Funders List', href: '/app/funders', icon: UsersIcon, roles: ['admin'] },
          { name: 'Funders Portal', href: '/app/funders/portal', icon: GlobeAltIcon, roles: ['admin'] },
        ]
      },
      { name: 'Projects', href: '/app/projects', icon: FolderIcon, roles: ['admin', 'donor'] },
      { name: 'Approvals', href: '/app/approvals', icon: ClipboardDocumentCheckIcon, roles: ['admin'], badge: pendingCount },
      { name: 'Accounts', href: '/app/accounts', icon: IdentificationIcon, roles: ['admin'] },
      { name: 'Audit', href: '/app/audit', icon: ClipboardDocumentListIcon, roles: ['admin'] },
      { name: 'Funders Portal', href: '/app/funders/portal', icon: HeartIcon, roles: ['admin', 'donor'] },
      { name: 'Integration', href: '/app/integration', icon: CreditCardIcon, roles: ['admin', 'donor'] },
      { name: 'Settings', href: '/app/settings', icon: Cog6ToothIcon, roles: ['admin', 'donor'] },
    ];

    // Only keep children if parent role matches
    const filterItems = (items) => items
      .filter(item => item.roles.includes(role))
      .map(item => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined
      }));

    return filterItems(baseItems);
  };

  const navigation = getNavigationItems();

  // Auto-open any group if current path is inside one of its children
  navigation.forEach((item) => {
    if (item.children && Array.isArray(item.children)) {
      const activeInGroup = item.children.some((c) => location.pathname.startsWith(c.href));
      if (activeInGroup && !openGroups[item.name]) {
        openGroups[item.name] = true; // safe to mutate before first render pass
      }
    }
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col sidebar-modern pt-6 ${collapsed ? 'w-20' : 'w-64'} transition-all duration-200`}>
      {/* Logo/Brand Section */}
      <div className={`flex h-24 flex-shrink-0 items-center ${collapsed ? 'justify-center px-4' : 'px-6'}`}>
        <div className={`w-full ${collapsed ? 'flex items-center justify-center' : ''}`}>
          <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
            <div className={`h-10 w-10 ${collapsed ? 'rounded-full' : 'rounded-lg'} flex items-center justify-center text-white font-bold bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sm`}>
              <span className="text-sm md:text-base" aria-hidden="true">F</span>
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="text-lg font-extrabold text-gray-900 brand-logo dark:text-slate-100">Fundify</div>
                <div className="text-xs text-gray-500">Finance dashboard</div>
              </div>
            )}

            {/* Desktop collapse/expand toggle */}
            {onToggleCollapse && (
              <div className="ml-auto flex items-center">
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    title="Collapse sidebar"
                    className="ml-3 inline-flex items-center justify-center p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    title="Expand sidebar"
                    className="ml-3 inline-flex items-center justify-center p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                    aria-label="Expand sidebar"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-2 py-5">
          {navigation.map((item) => {
            // Collapsible group
            if (item.children) {
              const isOpen = !!openGroups[item.name];
              const hasActiveChild = item.children.some((c) => location.pathname.startsWith(c.href));
              return (
                <div key={item.name} className="sidebar-group my-2">
                  <div className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide ${collapsed ? 'hidden' : 'text-slate-600 dark:text-slate-200 hover:bg-sky-50/60 dark:hover:bg-slate-800/60'}`} aria-controls={`group-${item.name}`}>
                    <Link to="/app/funders/portal" onClick={() => { closeAllGroups(); if (onNavigate) onNavigate(); }} className={`flex items-center gap-2 ${hasActiveChild ? 'text-sky-700 dark:text-sky-300' : ''}`}>
                      {/* Parent acts as a link to the Funders Portal */}
                      <span>{item.name}</span>
                    </Link>
                    <button type="button" onClick={() => toggleGroup(item.name)} aria-expanded={isOpen} className="p-1 rounded-md">
                      {isOpen ? (
                        <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                  </div>
                  {!collapsed && isOpen && (
                    <div id={`group-${item.name}`}>
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          to={child.href}
                          onClick={() => { if (onNavigate) onNavigate(); }}
                          aria-current={location.pathname.startsWith(child.href) ? 'page' : undefined}
                          className={`flex items-center ml-6 px-3 py-1.5 rounded text-sm gap-2 dark:text-slate-100 text-slate-800 hover:bg-sky-50 dark:hover:bg-slate-800 transition`}
                        >
                          {child.icon && <child.icon className="h-4 w-4 mr-1 text-sky-400" />}
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            // Default/flat item
            const isActive = location.pathname.startsWith(item.href);
            const isApprovals = item.name === 'Approvals';
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => { closeAllGroups(); if (onNavigate) onNavigate(); }}
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
                  {isApprovals && item.badge > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-600 text-white">{item.badge}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className={`px-4 py-4 space-y-3 ${collapsed ? 'flex flex-col items-center justify-center' : ''}`}>
        {/* Theme toggle */}
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

        {/* Sign out */}
        {user && (
          collapsed ? (
            <button title="Sign out" onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />        
              Sign out
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default Sidebar;
