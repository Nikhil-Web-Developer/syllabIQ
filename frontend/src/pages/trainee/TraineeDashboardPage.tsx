import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { courseService, Enrollment } from '../../services/courseService';
import { profileService, Certificate } from '../../services/profileService';
import { badgeService } from '../../services/badgeService';
import { BadgeShowcase } from '../../components/ui/BadgeShowcase';
import { BadgeItem } from '../../types';
import {
  BookOpen,
  Award,
  Clock,
  ChevronRight,
  Sparkles,
  PlayCircle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

export const TraineeDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [userBadges, setUserBadges] = useState<BadgeItem[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [enrollData, certData, myBadges, availableBadges] = await Promise.all([
        courseService.getMyEnrollments(),
        profileService.getMyCertificates(),
        badgeService.getMyBadges().catch(() => []),
        badgeService.getAllBadges().catch(() => []),
      ]);
      setEnrollments(enrollData);
      setCertificates(certData);
      setUserBadges(myBadges);
      setAllBadges(availableBadges);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const completedCount = enrollments.filter((e) => e.progress_percent === 100 || e.enrollment_status === 'completed').length;
  const inProgressCount = enrollments.length - completedCount;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.name}`}
        description="Track active training modules, assessment deadlines, and verified digital credentials."
        badge={<Badge variant="success">Trainee Portal</Badge>}
        action={
          <Link to="/trainee/courses">
            <Button>
              <BookOpen className="h-4 w-4 mr-1.5" />
              Explore Course Catalog
            </Button>
          </Link>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Enrolled Courses"
          value={enrollments.length}
          subtitle={`${inProgressCount} active, ${completedCount} completed`}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          title="Certificates Earned"
          value={certificates.length}
          subtitle="Verified Credentials"
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Progress"
          value={
            enrollments.length > 0
              ? `${Math.round(
                  enrollments.reduce((acc, e) => acc + (e.progress_percent || 0), 0) /
                    enrollments.length,
                )}%`
              : '0%'
          }
          subtitle="Across active modules"
          icon={<FileCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Upcoming Assessments"
          value={enrollments.length > 0 ? 1 : 0}
          subtitle="Timed MCQ Evaluation"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: In Progress Courses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">My Active Learning Modules</h2>
            <Link to="/trainee/courses" className="text-xs text-brand-400 font-semibold hover:underline">
              Browse all courses →
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading your enrolled courses...</div>
          ) : enrollments.length === 0 ? (
            <Card className="text-center py-12 space-y-3">
              <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No active enrollments</h3>
              <p className="text-xs text-slate-400">
                You have not enrolled in any training courses yet. Browse the catalog to start learning.
              </p>
              <Link to="/trainee/courses" className="inline-block mt-2">
                <Button size="sm">
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Browse Catalog
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {enrollments.map((e) => (
                <Card key={e.enrollment_id} className="hover:border-slate-600 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant={
                            e.difficulty === 'advanced'
                              ? 'purple'
                              : e.difficulty === 'intermediate'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {e.difficulty ? e.difficulty.toUpperCase() : 'INTERMEDIATE'}
                        </Badge>
                        {e.skill_name && (
                          <span className="text-xs text-brand-400 font-medium">
                            {e.skill_name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white">{e.course_title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Instructor: {e.trainer_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-semibold text-brand-400">
                          {e.progress_percent}% Done
                        </span>
                        <div className="w-24 bg-slate-700 h-2 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              e.progress_percent === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${e.progress_percent}%` }}
                          />
                        </div>
                      </div>
                      <Link to={`/trainee/courses/${e.course_id}`}>
                        <Button size="sm">
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Gamification Badges Section */}
          <BadgeShowcase
            userBadges={userBadges}
            allBadges={allBadges}
            title="Capacity Milestones &amp; Distinction Badges"
            subtitle="Earned recognition for assessment performance, speed, and Earth System science specializations."
          />
        </div>

        {/* Right Column: Platform Announcements & Guidelines */}
        <div className="space-y-6">
          <Card className="space-y-4 border-brand-500/30 bg-gradient-to-b from-brand-950/20 to-slate-900">
            <div className="flex items-center gap-2 text-brand-400">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-base font-bold text-white">Capacity Building Tip</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Complete lecture modules and update your progress to unlock the timed multiple-choice questionnaire and receive verifiable MoES-certified credentials.
            </p>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-white">Quick Links</h3>
            <div className="space-y-2 text-xs">
              <Link
                to="/trainee/profile"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <span>Edit Profile &amp; Skills</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/trainee/certificates"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <span>My Certificates ({certificates.length})</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
