import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import {
  MagnifyingGlassIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

const Navbar = ({ onMobileMenuToggle }) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { orgs, activeOrgId, switchOrg, role } = useOrg();
  const { expenses, incomes } = useFinance();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const accountDisplayName = (user?.email || '').split('@')[0] || 'User';
  const pendingCount = ((expenses || []).filter((e) => e.status === 'pending').length) +
                      ((incomes || []).filter((i) => i.status === 'pending').length);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const OrgSelector = () => {
    if (!orgs || orgs.length <= 1) return null;

    const handleOrgSwitch = (orgId) => {
      switchOrg(orgId);
      // Redirect to appropriate dashboard based on user's role in the selected org
      const selectedOrg = orgs.find(o => o.id === orgId);
      if (selectedOrg) {
        const memberships = Array.isArray(selectedOrg.memberships) ? selectedOrg.memberships : [];
        const userMembership = memberships.find(m => m && m.userId === user?.id);
        const isFunder = Array.isArray(selectedOrg.funders) ? selectedOrg.funders.some(f => f && f.id === user?.id) : false;
        const isAdmin = userMembership && (userMembership.role === 'admin' || userMembership.role === 'financial_officer');

        // If user is a funder but not admin in this org, redirect to donor portal
        if (isFunder && !isAdmin) {
          navigate(`/donor/funding`);
        }
      }
    };

    return (
      <select
        value={activeOrgId || ''}
        onChange={(e) => handleOrgSwitch(e.target.value)}
        className="px-3 py-2 rounded-full bg-white ring-1 ring-gray-200 text-sm focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
        aria-label="Select organization"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>{o.name || o.id}</option>
        ))}
      </select>
    );
  };

  return (
    <div className="sticky top-0 z-40 relative bg-white/80 text-gray-900 backdrop-blur-sm border-b border-gray-200 shadow-sm dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          {/* Left section - Mobile menu button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMobileMenuToggle}
              title="Open sidebar"
              aria-label="Open sidebar"
              className="p-2 rounded-full bg-white/90 shadow-sm ring-1 ring-gray-200 hover:shadow-md transform transition hover:-translate-y-0.5 focus:outline-none lg:hidden"
            >
              <Bars3Icon className="h-6 w-6 text-gray-700" />
            </button>
          </div>

          {/* Center section - Search */}
          <div className="flex-1 px-4 hidden sm:block">
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 placeholder:text-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-1 dark:ring-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-3">
            {/* Quick actions - hidden on mobile */}
            <div className="items-center gap-3 hidden md:flex">
              <OrgSelector />
              <Link to="/app/income" className="px-3.5 py-2 rounded-xl bg-gray-900 text-white hover:shadow-md">Income</Link>
              <Link to="/app/expenses" className="px-3.5 py-2 rounded-xl bg-white text-gray-700 hover:shadow-sm ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">Expenses</Link>
              <Link to="/app/reports" className="px-3.5 py-2 rounded-xl bg-white text-gray-700 hover:shadow-sm ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">Reports</Link>
              {role === 'admin' && (
                <Link to="/app/approvals" className="relative inline-flex items-center px-3 py-2 rounded-xl bg-white text-gray-700 hover:shadow-sm ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                  Approvals
                  {pendingCount > 0 && <span className="absolute -top-2 -right-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-600 text-white">{pendingCount}</span>}
                </Link>
              )}
            </div>

            {/* Notifications */}
            <button
              title="Notifications"
              aria-label="Notifications"
              onClick={() => navigate('/app/approvals')}
              className="relative p-2 rounded-full bg-white/90 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition transform hover:-translate-y-0.5 focus:outline-none dark:bg-slate-800/80 dark:text-slate-100 dark:ring-slate-700"
            >
              <BellIcon className="h-6 w-6 text-gray-700 dark:text-slate-100" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-600 text-white">{pendingCount}</span>
              )}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                title={user?.name || 'User menu'}
                aria-label={`User menu ${user?.name || ''}`}
                onClick={() => setUserDropdownOpen(!setUserDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full bg-white/90 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition transform hover:-translate-y-0.5 focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white py-2 shadow-xl ring-1 ring-gray-200 text-gray-800 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                  <div className="px-4 py-2 text-sm border-b dark:border-slate-700">
                    <div className="font-medium">{user?.name || 'User'}</div>
                    <div className="truncate text-gray-500 text-xs dark:text-slate-400">{user?.email || ''}</div>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
