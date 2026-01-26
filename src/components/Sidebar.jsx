import { Link, useLocation } from 'react-router-dom';
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
  PlusIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

const Sidebar = ({ collapsed, onToggleCollapse, onNavigate }) => {
  const location = useLocation();
  const { role } = useOrg();
  const { expenses, incomes, funders } = useFinance();

  const [openGroups, setOpenGroups] = useState(() => ({ Recent: false }));
  const toggleGroup = (name) => {
    setOpenGroups(prev => {
      const next = Object.keys(prev).reduce((acc, key) => {
        acc[key] = (key === 'Recent') ? prev[key] : false; // preserve Recent state
        return acc;
      }, {});
      next[name] = !prev[name];
      return next;
    });
  };

  // Recent routes shown at top (persisted in localStorage)
  const [recentRoutes, setRecentRoutes] = useState([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recent_routes') || '[]');
      const normalized = Array.isArray(stored) ? stored : [];
      // ensure current location is present and recent
      const current = location.pathname;
      // sensible defaults when no recent history exists
      const defaults = ['/app/dashboard/overview', '/app/funders', '/app/projects'];
      const initial = normalized.length === 0 ? defaults : normalized;
      const merged = [current, ...initial.filter(r => r !== current)].slice(0, 6);
      setRecentRoutes(merged);
      localStorage.setItem('recent_routes', JSON.stringify(merged));
    } catch (e) {
      // ignore
    }
  }, [location.pathname]);

  // Close all groups when a non-group item is clicked (preserve Recent)
  const closeAllGroups = () => {
    setOpenGroups(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k !== 'Recent') next[k] = false;
      });
      return next;
    });
  };

  const pendingCount = ((expenses || []).filter((e) => e.status === 'pending').length) +
                      ((incomes || []).filter((i) => i.status === 'pending').length);

  // Role-based navigation items
  const getNavigationItems = () => {
    const baseItems = [
      // Dashboard group with tabs
      {
        name: 'Dashboard', icon: HomeIcon, roles: ['admin', 'donor'],
        children: [
          { name: 'Overview', href: '/app/dashboard/overview', icon: HomeIcon, roles: ['admin', 'donor'] },
          { name: 'Funders', href: '/app/dashboard/funders', icon: UsersIcon, roles: ['admin'] },
          { name: 'Projects', href: '/app/dashboard/projects', icon: FolderIcon, roles: ['admin','donor'] },
        ]
      },

      // Transactions group
      {
        name: 'Transactions', icon: BanknotesIcon, roles: ['admin'],
        children: [
          { name: 'Income', href: '/app/income', icon: BanknotesIcon, roles: ['admin'] },
          { name: 'Expenses', href: '/app/expenses', icon: WalletIcon, roles: ['admin'] },
        ]
      },

      // Projects group
      {
        name: 'Projects', icon: FolderIcon, roles: ['admin','donor'],
        children: [
          { name: 'Add Project', href: '/app/projects', icon: PlusIcon, roles: ['admin'] },
          { name: 'Projects List', href: '/app/projects', icon: FolderIcon, roles: ['admin','donor'] },
        ]
      },

      // Reports group
      {
        name: 'Reports', icon: ChartBarIcon, roles: ['admin','donor'],
        children: [
          { name: 'Overview Reports', href: '/app/reports', icon: ChartBarIcon, roles: ['admin','donor'] },
          { name: 'Generate Reports', href: '/app/reports/import', icon: ChartBarIcon, roles: ['admin','donor'] },
        ]
      },

      // Funders group (existing)
      {
        name: 'Funders', icon: UsersIcon, roles: ['admin'],
        children: [
          { name: 'Add Funder', href: '/app/funders/add', icon: PlusIcon, roles: ['admin'] },
          { name: 'Funders List', href: '/app/funders', icon: UsersIcon, roles: ['admin'] },
          { name: 'Funders Portal', href: '/app/funders/portal', icon: GlobeAltIcon, roles: ['admin'] },
        ]
      },

      // Management group
      {
        name: 'Management', icon: FolderIcon, roles: ['admin','donor'],
        children: [
          { name: 'Accounts', href: '/app/accounts', icon: IdentificationIcon, roles: ['admin'] },
          { name: 'Audit', href: '/app/audit', icon: ClipboardDocumentListIcon, roles: ['admin'] },
        ]
      },

      // Workflow group
      {
        name: 'Workflow', icon: ClipboardDocumentCheckIcon, roles: ['admin'],
        children: [
          { name: 'Approvals', href: '/app/approvals', icon: ClipboardDocumentCheckIcon, roles: ['admin'], badge: pendingCount },
        ]
      },

      // Integration group
      {
        name: 'Integration', icon: CreditCardIcon, roles: ['admin','donor'],
        children: [
          { name: 'Payment Integration', href: '/app/integration', icon: CreditCardIcon, roles: ['admin','donor'] },
        ]
      },
    ];

    // Only keep children if parent role matches
    const filterItems = (items) => items
      .filter(item => item.roles.includes(role))
      .map(item => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined
      }));

    const items = filterItems(baseItems);

    // Build a Recent group if we have any recent routes
    // Build a quick lookup map of href -> { name, icon }
    const hrefMap = {};
    const buildMap = (itemsList) => {
      itemsList.forEach(it => {
        if (it.href) hrefMap[it.href] = { name: it.name, icon: it.icon };
        if (it.children) buildMap(it.children);
      });
    };
    buildMap(baseItems);
    // Always include Settings in hrefMap for Recent display
    hrefMap['/app/settings'] = { name: 'Settings', icon: Cog6ToothIcon };

    const recentChildren = (recentRoutes || [])
      .map((p) => {
        const meta = hrefMap[p] || null;
        const label = meta ? meta.name : (p.replace('/app/', '').replace(/\//g, ' - ') || p);
        const icon = meta ? meta.icon : null;
        return { name: label, href: p, icon };
      })
      .filter(Boolean);

    if (recentChildren.length > 0) {
      items.unshift({ name: 'Recent', icon: null, roles: ['admin', 'donor'], children: recentChildren });
    }

    return items;
  };

  const navigation = getNavigationItems();

  // Auto-open any group if current path is inside one of its children (skip Recent)
  navigation.forEach((item) => {
    if (item.name === 'Recent') return; // keep Recent collapsed by default and only toggle manually
    if (item.children && Array.isArray(item.children)) {
      const activeInGroup = item.children.some((c) => location.pathname.startsWith(c.href));
      if (activeInGroup && !openGroups[item.name]) {
        openGroups[item.name] = true; // safe to mutate before first render pass
      }
    }
  });

  return (
    <div className={`flex min-h-0 flex-1 flex-col sidebar-modern bg-white dark:bg-slate-900 ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out`}>
      {/* Logo/Brand Section */}
      <div className={`flex-shrink-0 border-b border-slate-200 dark:border-slate-700/50 ${collapsed ? 'px-2 py-4 flex items-center justify-center' : 'px-6 py-6'}`}>
        <div className={`w-full ${collapsed ? 'flex items-center justify-center' : ''}`}>
          <Link to="/app/dashboard/overview" onClick={() => { closeAllGroups(); if (onNavigate) onNavigate(); }} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} group`} aria-label="Go to dashboard">
            <div className={`h-10 w-10 ${collapsed ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center text-white font-bold bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-md group-hover:shadow-lg transition-all duration-200`}>
              <span className="text-base" aria-hidden="true">F</span>
            </div>
            {!collapsed && (
              <div className="leading-tight flex-1">
                <div className="text-base font-bold text-gray-900 brand-logo dark:text-slate-50">Fundify</div>
                <div className="text-xs text-gray-400 dark:text-slate-400">Finance management</div>
              </div>
            )}
          </Link>

          {/* Desktop collapse/expand toggle */}
          {onToggleCollapse && !collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="ml-2 inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          )}
          {onToggleCollapse && collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide">
        <nav className="flex-1 space-y-1 py-6 px-3">
          {navigation.map((item) => {
            // Collapsible group
            if (item.children) {
              const isOpen = !!openGroups[item.name];
              const hasActiveChild = item.children.some((c) => location.pathname.startsWith(c.href));
              // When sidebar is collapsed, show Recent children as icon-only grid
              if (collapsed && item.name === 'Recent') {
                return (
                  <div key={item.name} className="sidebar-group px-2 py-4">
                    <div className="flex flex-col gap-1.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.name + child.href}
                          to={child.href}
                          title={child.name}
                          onClick={() => { if (onNavigate) onNavigate(); }}
                          className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-600 active:bg-sky-200 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-sky-400 dark:active:bg-slate-600 transition-colors duration-150"
                        >
                          {child.icon ? <child.icon className="h-4 w-4" /> : <HomeIcon className="h-4 w-4" />}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              // Hide other groups when collapsed (except Recent)
              if (collapsed && item.name !== 'Recent') return null;

              return (
                <div key={item.name} className="sidebar-group">
                  <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-colors duration-150" aria-controls={`group-${item.name}`}>
                      {/** Determine a sensible parent href: prefer explicit href, otherwise first child's href, otherwise '#' */}
                      {(() => {
                        // For groups, clicking the name toggles expansion. For flat items, navigate.
                        const isGroup = Array.isArray(item.children) && item.children.length > 0;
                        const parentHref = isGroup ? '#' : (item.href || '#');
                        const handleParentClick = (e) => {
                          if (isGroup) {
                            e.preventDefault();
                            toggleGroup(item.name);
                            return;
                          }
                          closeAllGroups();
                          if (onNavigate) onNavigate();
                        };

                        return (
                          <a href={parentHref} onClick={handleParentClick} className={`flex items-center gap-2 cursor-pointer transition-colors ${hasActiveChild ? 'text-sky-600 dark:text-sky-400' : ''}`} role="button" tabIndex={0}>
                            <span>{item.name}</span>
                          </a>
                        );
                      })()}
                      <button type="button" onClick={() => toggleGroup(item.name)} aria-expanded={isOpen} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <ChevronDownIcon className={`h-4 w-4 text-slate-400 dark:text-slate-500 transform transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                      </button>
                    </div>
                  {!collapsed && isOpen && (
                    <div id={`group-${item.name}`} className={`overflow-hidden transition-all duration-200 ${item.name === 'Recent' ? 'ml-2 mt-2 p-2 rounded-lg bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-800/40 dark:to-slate-800/20 border border-sky-100 dark:border-slate-700' : 'mt-2 space-y-1'}`}>
                      {item.children.map((child) => {
                        const isActive = location.pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.name + child.href}
                            to={child.href}
                            onClick={() => { if (onNavigate) onNavigate(); }}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-center px-3 py-2 rounded-md text-sm gap-2.5 transition-all duration-150 ${
                              isActive
                                ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50/60 dark:hover:bg-slate-700/40'
                            } ${item.name === 'Recent' ? 'ml-1' : 'ml-3'}`}
                          >
                            {child.icon && <child.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />}
                            <span className="truncate">{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            // Default/flat item - hide when sidebar is collapsed (only show Recent)
            if (collapsed) return null;

            const isActive = location.pathname.startsWith(item.href);
            const isApprovals = item.name === 'Approvals';
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => { closeAllGroups(); if (onNavigate) onNavigate(); }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.name}
                className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-sky-200/60 dark:bg-sky-800/40' : 'bg-slate-100 dark:bg-slate-800/40'}`}>
                  <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400'}`} aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="whitespace-nowrap truncate">{item.name}</span>
                  {isApprovals && item.badge > 0 && (
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-600 text-white flex-shrink-0">{item.badge}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
