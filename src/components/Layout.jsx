import { Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import GlobalNotifier from './GlobalNotifier';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-base dashboard-bg overflow-x-hidden dark:bg-[#0b1220] dark:text-slate-100">
      {/* Navbar */}
      <Navbar onMobileMenuToggle={() => setSidebarOpen(true)} />

      <GlobalNotifier />

      {/* Desktop Sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:z-50 lg:rounded-tr-2xl lg:rounded-br-2xl lg:shadow-xl lg:overflow-hidden transition-all duration-200 ${desktopCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <Sidebar collapsed={desktopCollapsed} onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)} />
      </div>

      {/* Main Content */}
      <div className={`${desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'} pt-16 min-h-screen`}>
        <Outlet />
      </div>

      {/* Mobile sidebar overlay */}
      <div className={`lg:hidden ${sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-0 z-50 flex">
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-slate-900">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-600 dark:focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-gray-700 dark:text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
              <div className="flex flex-shrink-0 items-center px-4">
                <div className="h-8 w-8 rounded-full bg-indigo-600"></div>
              </div>
              <nav className="mt-5 space-y-1 px-2">
                <Sidebar collapsed={false} onNavigate={() => setSidebarOpen(false)} />
              </nav>
            </div>
          </div>
          <div className="w-14 flex-shrink-0"></div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          
          {/* Mobile sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col bg-white shadow-lg dark:bg-slate-900">
              <div className="flex h-16 flex-shrink-0 items-center justify-between px-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h1>
                <button
                  type="button"
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:hover:bg-slate-800"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar collapsed={false} isMobile={true} onNavigate={() => setSidebarOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
