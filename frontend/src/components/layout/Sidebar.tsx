import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  User,
  BookOpen,
  PlusCircle,
  Award,
  Library,
  Users,
  GitMerge,
  Megaphone,
  ShieldCheck,
  FolderGit2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const traineeLinks = [
    { to: '/trainee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/trainee/courses', label: 'Course Catalog', icon: BookOpen },
    { to: '/trainee/certificates', label: 'Certificates', icon: Award },
    { to: '/trainee/profile', label: 'My Profile & Skills', icon: User },
  ];

  const trainerLinks = [
    { to: '/trainer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/trainer/courses', label: 'My Courses', icon: BookOpen },
    { to: '/trainer/courses/new', label: 'Create Course', icon: PlusCircle },
    { to: '/trainer/library', label: 'Trainer Library', icon: FolderGit2 },
    { to: '/trainer/profile', label: 'Expertise Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Approvals & Roles', icon: Users },
    { to: '/admin/competency-mapping', label: 'Competency Matching', icon: GitMerge },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/admin/audit-log', label: 'Audit Trail', icon: ShieldCheck },
  ];

  const links =
    role === 'admin'
      ? adminLinks
      : role === 'trainer'
      ? trainerLinks
      : traineeLinks;

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 p-4 min-h-[calc(100vh-4rem)]">
      <div className="mb-4 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {role?.toUpperCase()} NAVIGATION
      </div>

      <nav className="space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-sm font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
