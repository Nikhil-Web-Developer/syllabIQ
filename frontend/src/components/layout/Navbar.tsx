import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../ui/Badge';
import { LogOut, User as UserIcon, BookOpen, Shield, Bell } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'purple';
      case 'trainer':
        return 'info';
      case 'trainee':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-all">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              Syllab<span className="text-brand-400">IQ</span>
            </span>
            <span className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase -mt-1">
              MoES Capacity Portal
            </span>
          </div>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-800">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-200 leading-none">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                </div>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role.toUpperCase()}
                </Badge>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                title="Log Out"
              >
                <LogOut className="h-4 w-4 text-rose-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-400 transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
