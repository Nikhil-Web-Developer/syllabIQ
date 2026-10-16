import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ShieldCheck,
  Calendar,
  User,
  Terminal,
  Search,
  Filter,
  Eye,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { adminService, AuditLog } from '../../services/adminService';

export const AdminAuditLogPage: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['admin-audit-logs', selectedAction, actorSearch],
    queryFn: () =>
      adminService.getAuditLogs({
        action: selectedAction || undefined,
        actor: actorSearch || undefined,
        limit: 100,
      }),
  });

  const getActionBadge = (action: string) => {
    if (action.includes('approve') || action.includes('publish')) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {action}
        </span>
      );
    }
    if (action.includes('reject') || action.includes('delete')) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {action}
        </span>
      );
    }
    if (action.includes('role') || action.includes('assign')) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
        {action}
      </span>
    );
  };

  const copyMetadata = (meta: any) => {
    navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader
        title="Security & System Audit Trail"
        description="Immutable chronological record of administrative actions, user approval decisions, role changes, course publishing, and broadcast updates for government compliance."
        badge={<Badge variant="purple">MoES Compliance & Security</Badge>}
      />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Filter by Action Type
          </label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full bg-slate-950 text-xs text-white px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Action Types</option>
            <option value="approved_user">approved_user</option>
            <option value="rejected_user">rejected_user</option>
            <option value="updated_user_role">updated_user_role</option>
            <option value="assigned_trainer">assigned_trainer</option>
            <option value="published_course">published_course</option>
            <option value="archived_course">archived_course</option>
            <option value="deleted_course">deleted_course</option>
            <option value="published_announcement">published_announcement</option>
            <option value="updated_announcement">updated_announcement</option>
            <option value="deleted_announcement">deleted_announcement</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Search Actor (Name / Email)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search admin or actor..."
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              className="w-full bg-slate-950 text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-end">
          <Button
            variant="secondary"
            className="w-full text-xs"
            onClick={() => {
              setSelectedAction('');
              setActorSearch('');
            }}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="p-0 overflow-hidden border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Timestamp (UTC)</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target ID</th>
                <th className="p-4">Details / Metadata</th>
                <th className="p-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 animate-pulse">
                    Loading audit trail entries...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{log.actor_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{log.actor_email}</div>
                    </td>
                    <td className="p-4">{getActionBadge(log.action)}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {log.target_id ? `${log.target_id.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="p-4 max-w-xs truncate text-[11px] text-slate-400 font-mono">
                      {typeof log.metadata === 'object'
                        ? JSON.stringify(log.metadata)
                        : String(log.metadata || '-')}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600/30 hover:text-brand-300 text-slate-400 transition-colors"
                        title="Inspect full JSON payload"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Metadata Inspector Drawer / Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">Audit Event Details</h3>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block">Event Action:</span>
                <span className="font-bold text-brand-300 font-mono mt-0.5 block">{inspectLog.action}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block">Actor:</span>
                <span className="font-bold text-white mt-0.5 block">{inspectLog.actor_name} ({inspectLog.actor_role})</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block">Target ID:</span>
                <span className="font-mono text-slate-300 mt-0.5 block">{inspectLog.target_id || 'None'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="font-mono text-slate-300 mt-0.5 block">{new Date(inspectLog.created_at).toISOString()}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-400">Metadata Payload (JSON):</span>
                <button
                  onClick={() => copyMetadata(inspectLog.metadata)}
                  className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-60">
                {JSON.stringify(inspectLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setInspectLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
