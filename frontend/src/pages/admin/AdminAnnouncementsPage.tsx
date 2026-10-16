import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Megaphone,
  Plus,
  Calendar,
  User,
  Trash2,
  Edit2,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import { Announcement, AnnouncementType } from '../../types';

export const AdminAnnouncementsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['admin-announcements', selectedType, searchQuery],
    queryFn: () =>
      announcementService.getAnnouncements({
        type: selectedType === 'all' ? undefined : selectedType,
        search: searchQuery || undefined,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () => announcementService.createAnnouncement({ title, body, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcements'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to create announcement');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (id: string) => announcementService.updateAnnouncement(id, { title, body, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcements'] });
      setEditingAnnouncement(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to update announcement');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcements'] });
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setTitle('');
    setBody('');
    setType('announcement');
    setFormError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditModal = (a: Announcement) => {
    setTitle(a.title);
    setBody(a.body);
    setType(a.type);
    setFormError(null);
    setEditingAnnouncement(a);
  };

  const getTypeBadge = (annType: AnnouncementType) => {
    switch (annType) {
      case 'achievement':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="h-3 w-3" />
            Achievement
          </span>
        );
      case 'new_content':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="h-3 w-3" />
            New Content
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Megaphone className="h-3 w-3" />
            Announcement
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title="Public Announcements & Feeds Management"
        description="Broadcast notifications, workshop achievements, and auto-generated course publications to the platform homepage feed."
        badge={<Badge variant="purple">Newsroom Admin</Badge>}
        action={
          <Button onClick={openCreateModal} className="shadow-lg shadow-brand-500/20">
            <Plus className="h-4 w-4" />
            Publish Announcement
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'announcement', 'achievement', 'new_content'].map((filterVal) => (
            <button
              key={filterVal}
              onClick={() => setSelectedType(filterVal)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                selectedType === filterVal
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {filterVal === 'all' ? 'All Broadcasts' : filterVal.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Announcement List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 text-sm animate-pulse">
            Loading platform announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            No announcements match your search filter.
          </div>
        ) : (
          announcements.map((a) => (
            <Card
              key={a.id}
              className="space-y-3 hover:border-slate-700/80 transition-all bg-gradient-to-r from-slate-900/90 to-slate-900/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeBadge(a.type)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 mr-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    {new Date(a.publishedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => openEditModal(a)}
                    className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Announcement"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(a.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete Announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-white">{a.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{a.body}</p>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-slate-500" />
                  Published by: <strong className="text-slate-400">{a.authorName || 'Ministry Administrator'}</strong>
                </span>
                <span className="text-slate-600 font-mono text-[10px]">{a.id}</span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Announcement Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand-400" />
              Publish Broadcast Announcement
            </h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Announcement Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Oceanography Fellowship Applications Open"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category / Broadcast Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AnnouncementType)}
                  className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="announcement">Announcement (General Notice)</option>
                  <option value="achievement">Achievement (Milestone / Success)</option>
                  <option value="new_content">New Content (Course / Resource)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Body
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter broadcast details, target audience, schedules, or links..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                isLoading={createMutation.isPending}
                disabled={!title.trim() || !body.trim()}
              >
                Publish Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-brand-400" />
              Edit Announcement
            </h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category / Broadcast Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AnnouncementType)}
                  className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-brand-500"
                >
                  <option value="announcement">Announcement (General Notice)</option>
                  <option value="achievement">Achievement (Milestone / Success)</option>
                  <option value="new_content">New Content (Course / Resource)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Body
                </label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingAnnouncement(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate(editingAnnouncement.id)}
                isLoading={updateMutation.isPending}
                disabled={!title.trim() || !body.trim()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-400" />
              Delete Announcement?
            </h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to delete this broadcast? It will immediately disappear from the public homepage newsfeed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deletingId)}
                isLoading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
