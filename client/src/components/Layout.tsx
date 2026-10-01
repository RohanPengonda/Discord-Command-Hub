import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  FileText,
  Settings,
  Bot,
  LogOut,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn.js';

const navItems = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Audit Logs', path: '/dashboard/logs', icon: FileText },
  { label: 'Command Config', path: '/dashboard/commands', icon: Bot },
  { label: 'Discord Settings', path: '/dashboard/settings', icon: Settings },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-2 sm:px-3 py-4 mb-6 border-b border-slate-800">
        <div className="p-2 bg-brand-500 rounded-lg text-white shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm tracking-wide text-white truncate">Discord Automation</h1>
          <p className="text-xs text-slate-400 truncate">Admin Dashboard</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || user?.email}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role || 'Admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 shrink-0 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 h-14">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 -ml-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-brand-500 rounded-md text-white shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-white truncate">Discord Automation</span>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-50 transition-opacity duration-200',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 overflow-y-auto transition-transform duration-200',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Navigation
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 sticky top-0 h-screen overflow-y-auto">
          <div>
            <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800">
              <div className="p-2 bg-brand-500 rounded-lg text-white shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm tracking-wide text-white truncate">Discord Automation</h1>
                <p className="text-xs text-slate-400 truncate">Admin Dashboard</p>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || user?.email}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role || 'Admin'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 shrink-0 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 xl:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile / Tablet Content */}
      <main className="lg:hidden p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};