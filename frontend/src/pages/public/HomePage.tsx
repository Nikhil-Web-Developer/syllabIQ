import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  BookOpen,
  Award,
  Sparkles,
  GitMerge,
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  Users,
  Megaphone,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import { Announcement, AnnouncementType } from '../../types';
import { courseService } from '../../services/courseService';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch public announcements feed
  const { data: announcements = [], isLoading: loadingAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['public-announcements', activeTab],
    queryFn: () =>
      announcementService.getAnnouncements({
        type: activeTab === 'all' ? undefined : activeTab,
        limit: 6,
      }),
  });

  // Fetch published featured courses
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['public-featured-courses'],
    queryFn: () => courseService.getCourses(),
  });

  const featuredCourses = courses.filter((c: any) => c.status === 'published').slice(0, 3);

  const getTypeBadge = (annType: AnnouncementType) => {
    switch (annType) {
      case 'achievement':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="h-3 w-3" />
            Achievement
          </span>
        );
      case 'new_content':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="h-3 w-3" />
            New Content
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Megaphone className="h-3 w-3" />
            Announcement
          </span>
        );
    }
  };

  return (
    <div className="space-y-12 py-4 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950/40 to-slate-900 border border-brand-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Digital Capacity Building &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-300">
              Learning Portal
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            Centralized learning and workforce capacity platform for the Ministry of Earth Sciences (MoES).
            Featuring automated competency-based trainer matching, interactive MCQ assessments, verified certification, and organizational analytics.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="px-8 shadow-lg shadow-brand-500/25">
                Get Started
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                Portal Login
              </Button>
            </Link>
            <Link to="/catalog">
              <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white">
                Explore Course Catalog
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Public Announcements & Newsfeed Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-brand-400" />
              Ministry Newsfeed &amp; Capacity Announcements
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Official circulars, milestone achievements, and newly published learning modules across MoES institutes.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
            {['all', 'announcement', 'achievement', 'new_content'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab === 'all' ? 'All' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Announcements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingAnnouncements ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm animate-pulse">
              Loading latest news and broadcasts...
            </div>
          ) : announcements.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
              No broadcasts found in this category.
            </div>
          ) : (
            announcements.map((a) => (
              <Card
                key={a.id}
                className="flex flex-col justify-between hover:border-brand-500/40 transition-all group bg-gradient-to-b from-slate-900/90 to-slate-900/60"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {getTypeBadge(a.type)}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      {new Date(a.publishedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {a.body}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Author: <strong className="text-slate-400">{a.authorName || 'Ministry Admin'}</strong></span>
                  <span className="text-brand-400 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center">
                    Read <ArrowRight className="h-3 w-3 ml-0.5" />
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Featured Courses Section */}
      {featuredCourses.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-emerald-400" />
                Featured Learning Modules
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                High-demand courses authored by certified Ministry senior scientists.
              </p>
            </div>
            <Link to="/catalog">
              <Button variant="secondary" size="sm">
                View All Courses
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCourses.map((course: any) => (
              <Card
                key={course.id}
                className="flex flex-col justify-between hover:border-emerald-500/40 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="success">Published</Badge>
                    <span className="text-xs text-slate-400 capitalize font-medium">
                      {course.difficulty}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {course.description || 'Comprehensive training module in Earth System Sciences.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Lead: <strong className="text-white">{course.trainerName || 'Faculty'}</strong>
                  </span>
                  <Link to="/catalog">
                    <span className="text-emerald-400 font-semibold group-hover:underline inline-flex items-center">
                      Enroll <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3 Core Roles Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800/80">
        <Card className="hover:border-emerald-500/40 transition-all group">
          <div className="p-3 w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <Badge variant="success">Trainee</Badge>
          <h3 className="mt-3 text-lg font-bold text-white">Trainee Module</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Profile building, skill tagging, course catalog self-enrollment, timed auto-graded MCQ assessments, and verifiable PDF certificates.
          </p>
        </Card>

        <Card className="hover:border-blue-500/40 transition-all group">
          <div className="p-3 w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6" />
          </div>
          <Badge variant="info">Trainer</Badge>
          <h3 className="mt-3 text-lg font-bold text-white">Trainer Module</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Subject-matter expertise tags, course authoring, question bank creation with custom pass percentages, multimedia resource uploads, and progress tracking.
          </p>
        </Card>

        <Card className="hover:border-purple-500/40 transition-all group">
          <div className="p-3 w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <GitMerge className="h-6 w-6" />
          </div>
          <Badge variant="purple">Admin</Badge>
          <h3 className="mt-3 text-lg font-bold text-white">Competency Engine &amp; Admin</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Automated weighted trainer-to-course matching algorithm, user approval gating, real-time analytics dashboards, public newsroom announcements, and audit logging.
          </p>
        </Card>
      </div>

      {/* Highlights & Differentiators */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-400" />
          Platform Architectural Highlights
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-200">Role-Based Guarding</p>
            <p className="text-slate-400 text-xs">Approval-gated accounts with JWT tokens and granular RBAC guards.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-200">Competency Matching</p>
            <p className="text-slate-400 text-xs">Formula-driven ranking based on proficiency, experience, and past ratings.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-200">Executive Analytics</p>
            <p className="text-slate-400 text-xs">Real-time enrollment velocity, pass rates, and skill-gap heatmaps.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-200">Auditability &amp; Traceability</p>
            <p className="text-slate-400 text-xs">Government-grade audit logging of all approvals and role mutations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
