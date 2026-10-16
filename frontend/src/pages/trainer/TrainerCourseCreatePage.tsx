import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { profileService, Skill } from '../../services/profileService';
import { courseService } from '../../services/courseService';
import { Sparkles, ArrowLeft, BookOpen } from 'lucide-react';

export const TrainerCourseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectSkillId, setSubjectSkillId] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const data = await profileService.getSkillsTaxonomy();
      setSkills(data);
      if (data.length > 0) {
        setSubjectSkillId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load taxonomy:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await courseService.createCourse({
        title,
        description,
        subjectSkillId: subjectSkillId || undefined,
        difficulty,
        status,
      });
      navigate('/trainer/courses');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/trainer/courses')}
        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Course Management
      </button>

      <PageHeader
        title="Author New Course Module"
        description="Define course metadata, tag subject competencies for matching, and configure publishing visibility."
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Numerical Weather Prediction with WRF 4.0"
              className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Primary Subject Competency Tag *
            </label>
            <select
              value={subjectSkillId}
              onChange={(e) => setSubjectSkillId(e.target.value)}
              className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Links this course to the unified organizational taxonomy for capacity tracking and trainer matching.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Course Description &amp; Learning Objectives *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Comprehensive description of topics covered, mathematical foundations, prerequisites, and operational outcomes..."
              className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Difficulty Tier
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="draft">Draft (Work in Progress)</option>
                <option value="published">Published (Visible in Catalog)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/60 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/trainer/courses')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <BookOpen className="h-4 w-4 mr-1.5" />
              <span>{isSubmitting ? 'Creating Course...' : 'Save & Create Course'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
