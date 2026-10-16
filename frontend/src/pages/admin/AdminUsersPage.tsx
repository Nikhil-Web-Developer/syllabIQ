import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PublicProfileModal } from '../../components/public/PublicProfileModal';
import { adminService, AdminUser } from '../../services/adminService';
import {
  Check,
  X,
  Shield,
  Search,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Filter,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await adminService.approveUser(id);
      showToast(res.message);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: 'approved' } : u)),
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Please enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
      setActionLoadingId(id);
      const res = await adminService.rejectUser(id, reason);
      showToast(res.message);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: 'rejected' } : u)),
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reject user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'trainee' | 'trainer' | 'admin') => {
    try {
      setActionLoadingId(userId);
      const res = await adminService.updateUserRole(userId, newRole);
      showToast(res.message);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered users
  const pendingCount = users.filter((u) => u.status === 'pending').length;

  const filteredUsers = users.filter((u) => {
    const matchesStatus =
      statusFilter === 'all' || u.status === statusFilter;
    const matchesRole =
      roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      searchTerm === '' ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.bio && u.bio.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Approvals & Role Governance"
        description="Review incoming trainee and faculty registrations, approve/reject platform access, and manage user role privileges."
        badge={<Badge variant="purple">MoES Security Gate</Badge>}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-200 text-sm font-medium flex items-center justify-between shadow-lg">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-brand-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-3 w-3 text-amber-400" />
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Search & Role Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email..."
              className="rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="trainee">Trainees</option>
            <option value="trainer">Trainers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table Card */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading user registrations...</div>
      ) : filteredUsers.length === 0 ? (
        <Card className="text-center py-16">
          <User className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No users matching filter</h3>
          <p className="text-xs text-slate-400 mt-1">
            {statusFilter === 'pending'
              ? 'There are currently no registration requests pending approval.'
              : 'Try clearing your search query or selecting a different status filter.'}
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden shadow-xl border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase border-b border-slate-700">
              <tr>
                <th className="p-4">User Name &amp; Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Registration Status</th>
                <th className="p-4">Professional Bio / Context</th>
                <th className="p-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{u.name}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Registered: {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          u.role === 'admin'
                            ? 'purple'
                            : u.role === 'trainer'
                            ? 'info'
                            : 'success'
                        }
                      >
                        {u.role.toUpperCase()}
                      </Badge>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        disabled={actionLoadingId === u.id || u.role === 'admin'}
                        className="bg-slate-900 border border-slate-700 text-[11px] rounded-lg px-2 py-0.5 text-slate-300 focus:outline-none"
                      >
                        <option value="trainee">Trainee</option>
                        <option value="trainer">Trainer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>

                  <td className="p-4">
                    <Badge
                      variant={
                        u.status === 'approved'
                          ? 'success'
                          : u.status === 'pending'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {u.status === 'pending' ? 'PENDING REVIEW' : u.status.toUpperCase()}
                    </Badge>
                  </td>

                  <td className="p-4 text-slate-400 max-w-xs">
                    <div className="line-clamp-2">{u.bio || 'No bio submitted'}</div>
                    {u.years_experience !== null && u.years_experience !== undefined && (
                      <span className="text-[10px] text-brand-400 block mt-0.5">
                        Experience: {u.years_experience} yrs
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    {u.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleApprove(u.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          <span>{actionLoadingId === u.id ? 'Saving...' : 'Approve'}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleReject(u.id)}
                          className="text-xs"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingProfileId(u.id)}
                          className="text-xs"
                        >
                          View Profile
                        </Button>
                        {u.status === 'rejected' && (
                          <Button
                            size="sm"
                            disabled={actionLoadingId === u.id}
                            onClick={() => handleApprove(u.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                          >
                            Re-Approve
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Public Profile View Modal */}
      {viewingProfileId && (
        <PublicProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}
    </div>
  );
};
