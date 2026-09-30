import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { LayoutDashboard, FileText, Settings, Bot, LogOut, ShieldAlert } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Audit Logs', path: '/dashboard/logs', icon: FileText },
    { label: 'Command Config', path: '/dashboard/commands', icon: Bot },
    { label: 'Discord Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          {/* Logo Branding */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">Discord Automation</h1>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || user?.email}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role || 'Admin'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
