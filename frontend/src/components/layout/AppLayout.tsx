import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/authStore';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const showSidebar = isAuthenticated && user && user.status === 'approved';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex mx-auto w-full max-w-7xl">
        {showSidebar && <Sidebar />}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
