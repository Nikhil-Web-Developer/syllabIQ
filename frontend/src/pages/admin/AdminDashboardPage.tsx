import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  Award,
  BookOpen,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Flame,
  Filter,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import {
  DashboardEnrollmentsData,
  DashboardCertificationsData,
  DashboardAssessmentsData,
  DashboardParticipationData,
} from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const [dateRangeKey, setDateRangeKey] = useState<'all' | '30d' | '90d' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Compute ISO date range params
  const dateParams = React.useMemo(() => {
    const now = new Date();
    if (dateRangeKey === '30d') {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (dateRangeKey === '90d') {
      const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (dateRangeKey === 'custom' && customFrom && customTo) {
      return {
        from: new Date(customFrom).toISOString(),
        to: new Date(customTo + 'T23:59:59.999Z').toISOString(),
      };
    }
    return {};
  }, [dateRangeKey, customFrom, customTo]);

  // Fetch queries in parallel
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<DashboardEnrollmentsData>({
    queryKey: ['admin-dashboard-enrollments', dateParams],
    queryFn: () => adminService.getDashboardEnrollments(dateParams),
  });

  const { data: certifications, isLoading: loadingCerts } = useQuery<DashboardCertificationsData>({
    queryKey: ['admin-dashboard-certifications', dateParams],
    queryFn: () => adminService.getDashboardCertifications(dateParams),
  });

  const { data: assessments, isLoading: loadingAssessments } = useQuery<DashboardAssessmentsData>({
    queryKey: ['admin-dashboard-assessments', dateParams],
    queryFn: () => adminService.getDashboardAssessments(dateParams),
  });

  const { data: participation, isLoading: loadingParticipation } = useQuery<DashboardParticipationData>({
    queryKey: ['admin-dashboard-participation', dateParams],
    queryFn: () => adminService.getDashboardParticipation(dateParams),
  });

  const isLoading = loadingEnrollments || loadingCerts || loadingAssessments || loadingParticipation;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <PageHeader
          title="Executive Analytics & Capacity Dashboard"
          description="Real-time capacity building metrics across Ministry of Earth Sciences units, competency gap heatmap, and assessment performance."
          badge={<Badge variant="purple">MoES Analytics Portal</Badge>}
        />

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-inner">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-brand-400" />
            <span>Time Window:</span>
          </div>
          <button
            onClick={() => setDateRangeKey('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              dateRangeKey === 'all'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setDateRangeKey('30d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              dateRangeKey === '30d'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRangeKey('90d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              dateRangeKey === '90d'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setDateRangeKey('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              dateRangeKey === 'custom'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Custom
          </button>

          {dateRangeKey === 'custom' && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-slate-800 text-xs text-white px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-slate-800 text-xs text-white px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Core Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Capacity Users"
          value={isLoading ? '...' : participation?.active_user_count ?? 0}
          subtitle={`${participation?.trainee_count ?? 0} Trainees · ${participation?.trainer_count ?? 0} Trainers`}
          icon={<Users className="h-5 w-5 text-indigo-400" />}
          trend={participation?.pending_approval_count ? `${participation.pending_approval_count} Pending Review` : undefined}
          trendPositive={!participation?.pending_approval_count}
        />
        <StatCard
          title="Total Enrollments"
          value={isLoading ? '...' : enrollments?.total_enrollments ?? 0}
          subtitle={`${enrollments?.breakdown?.completed ?? 0} Completed · ${enrollments?.breakdown?.active ?? 0} In Progress`}
          icon={<BookOpen className="h-5 w-5 text-brand-400" />}
          trend={`${enrollments?.breakdown?.avg_progress_percent ?? 0}% Avg Progress`}
          trendPositive={true}
        />
        <StatCard
          title="Certificates Issued"
          value={isLoading ? '...' : certifications?.total_certificates ?? 0}
          subtitle={`${certifications?.unique_trainees_certified ?? 0} Unique Certified Trainees`}
          icon={<Award className="h-5 w-5 text-amber-400" />}
          trend={`${certifications?.certified_courses_count ?? 0} Courses Covered`}
          trendPositive={true}
        />
        <StatCard
          title="Assessment Pass Rate"
          value={isLoading ? '...' : `${assessments?.overall_pass_rate ?? 0}%`}
          subtitle={`${assessments?.passed_attempts ?? 0} Passed / ${assessments?.total_attempts ?? 0} Total Attempts`}
          icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          trend={`${assessments?.avg_score ?? 0}% Avg Score`}
          trendPositive={(assessments?.overall_pass_rate ?? 0) >= 70}
        />
      </div>

      {/* Row 1: Enrollment Trends Over Time & Completion Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Area / Bar Timeline */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-400" />
              Enrollment & Certification Velocity
            </h2>
            <Badge variant="info">
              {enrollments?.enrollments_over_time?.length ?? 0} Active Buckets
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Chronological distribution of trainee enrollments and certifications issued:
          </p>

          {enrollments?.enrollments_over_time && enrollments.enrollments_over_time.length > 0 ? (
            <div className="pt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-xs text-slate-400">Enrollment Timeline Data</span>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-2">
                    {enrollments.enrollments_over_time.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                        <span className="text-slate-300">{item.bucket}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-500 h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(15, (item.count / (enrollments.total_enrollments || 1)) * 100))}%`,
                              }}
                            />
                          </div>
                          <span className="font-bold text-brand-400 w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-xs text-slate-400">Certification Timeline Data</span>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-2">
                    {certifications?.issuance_over_time && certifications.issuance_over_time.length > 0 ? (
                      certifications.issuance_over_time.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                          <span className="text-slate-300">{item.bucket}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(15, (item.count / (certifications.total_certificates || 1)) * 100))}%`,
                                }}
                              />
                            </div>
                            <span className="font-bold text-amber-400 w-8 text-right">{item.count}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 pt-4 text-center">No certifications in selected window</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No enrollment activity recorded in this time range.
            </div>
          )}
        </Card>

        {/* Enrollment Status Breakdown */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Enrollment Status Breakdown
          </h2>
          <p className="text-xs text-slate-400">
            Trainee progression across all active courses:
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Active In-Progress
                </span>
                <span className="font-semibold text-blue-400">
                  {enrollments?.breakdown?.active ?? 0} (
                  {enrollments?.total_enrollments
                    ? Math.round(((enrollments.breakdown.active || 0) / enrollments.total_enrollments) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{
                    width: `${
                      enrollments?.total_enrollments
                        ? ((enrollments.breakdown?.active || 0) / enrollments.total_enrollments) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Completed &amp; Passed
                </span>
                <span className="font-semibold text-emerald-400">
                  {enrollments?.breakdown?.completed ?? 0} (
                  {enrollments?.total_enrollments
                    ? Math.round(((enrollments.breakdown.completed || 0) / enrollments.total_enrollments) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${
                      enrollments?.total_enrollments
                        ? ((enrollments.breakdown?.completed || 0) / enrollments.total_enrollments) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Dropped / Incomplete
                </span>
                <span className="font-semibold text-rose-400">
                  {enrollments?.breakdown?.dropped ?? 0} (
                  {enrollments?.total_enrollments
                    ? Math.round(((enrollments.breakdown.dropped || 0) / enrollments.total_enrollments) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{
                    width: `${
                      enrollments?.total_enrollments
                        ? ((enrollments.breakdown?.dropped || 0) / enrollments.total_enrollments) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 mt-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Average Trainee Progress:</span>
            <span className="font-bold text-white text-sm">
              {enrollments?.breakdown?.avg_progress_percent ?? 0}%
            </span>
          </div>
        </Card>
      </div>

      {/* Row 2: Assessment Pass Rates by Module & Most Active Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assessment Pass Rates */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              Assessment Pass Rates by Question Bank
            </h2>
            <Badge variant="success">
              {assessments?.by_course?.length ?? 0} Question Banks
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Performance metrics, average test score, and pass percentage by module:
          </p>

          <div className="space-y-3 pt-2 max-h-72 overflow-y-auto pr-2">
            {assessments?.by_course && assessments.by_course.length > 0 ? (
              assessments.by_course.map((bank) => (
                <div
                  key={bank.question_bank_id}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{bank.question_bank_title}</p>
                      <p className="text-[11px] text-slate-400">{bank.course_title}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
                          bank.pass_rate >= 75
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : bank.pass_rate >= 50
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {bank.pass_rate}% Pass Rate
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>
                      Attempts: <strong className="text-white">{bank.attempt_count}</strong> ({bank.passed_count} passed, {bank.failed_count} failed)
                    </span>
                    <span>
                      Avg Score: <strong className="text-brand-300">{bank.avg_score}%</strong>
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        bank.pass_rate >= 75 ? 'bg-emerald-500' : bank.pass_rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, bank.pass_rate))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">No assessment attempts recorded in this time range.</p>
            )}
          </div>
        </Card>

        {/* Most Active Courses */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400" />
              Most Active Capacity Courses
            </h2>
            <Badge variant="purple">
              {participation?.most_active_courses?.length ?? 0} Courses
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Ranked by combined trainee throughput (enrollments + completions):
          </p>

          <div className="space-y-3 pt-2 max-h-72 overflow-y-auto pr-2">
            {participation?.most_active_courses && participation.most_active_courses.length > 0 ? (
              participation.most_active_courses.map((course, idx) => (
                <div
                  key={course.course_id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-xs">{course.course_title}</p>
                      <p className="text-[11px] text-slate-400">
                        Lead: {course.trainer_name} · Domain: {course.skill_name || 'General'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-white text-xs block">
                      {course.total_enrollments} Enrolled
                    </span>
                    <span className="text-[11px] text-emerald-400">
                      {course.total_completions} Completed
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">No active courses found.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Org-wide Skill-Gap Heatmap Matrix */}
      <Card className="space-y-4 border-brand-500/20 bg-gradient-to-b from-slate-900/90 to-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-400" />
              Organization-Wide Scientific Skill-Gap Heatmap
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Workforce distribution across Ministry core disciplines by competency level:
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-800" /> 0</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-900/40" /> 1-2</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600/60" /> 3-5</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-500" /> 6+</span>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">Subject Category / Discipline</th>
                <th className="py-3 px-4 font-semibold text-center">Beginner</th>
                <th className="py-3 px-4 font-semibold text-center">Intermediate</th>
                <th className="py-3 px-4 font-semibold text-center">Advanced</th>
                <th className="py-3 px-4 font-semibold text-center">Expert</th>
                <th className="py-3 px-4 font-semibold text-right">Total Tagged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {participation?.skill_gap_heatmap && participation.skill_gap_heatmap.length > 0 ? (
                participation.skill_gap_heatmap.map((row) => {
                  const getHeatBg = (count: number) => {
                    if (count >= 6) return 'bg-brand-500 text-white font-bold';
                    if (count >= 3) return 'bg-brand-600/60 text-brand-100 font-semibold';
                    if (count >= 1) return 'bg-brand-900/40 text-brand-300 font-medium';
                    return 'bg-slate-800/40 text-slate-500';
                  };

                  return (
                    <tr key={row.category} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-400" />
                        {row.category}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs ${getHeatBg(row.beginner)}`}>
                          {row.beginner}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs ${getHeatBg(row.intermediate)}`}>
                          {row.intermediate}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs ${getHeatBg(row.advanced)}`}>
                          {row.advanced}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs ${getHeatBg(row.expert)}`}>
                          {row.expert}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200">
                        {row.total_tagged}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No competency taxonomy tags mapped yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
