import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin' && !allowedRoles.includes(user.role)) {
    const defaultDashboard =
      user.role === 'trainer' ? '/trainer/dashboard' : '/trainee/dashboard';
    return <Navigate to={defaultDashboard} replace />;
  }

  return <Outlet />;
};
