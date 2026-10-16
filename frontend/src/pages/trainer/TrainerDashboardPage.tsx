import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { courseService, Course } from '../../services/courseService';
import {
  BookOpen,
  Users,
  Star,
  PlusCircle,
  BarChart3,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FolderGit2,
} from 'lucide-react';

export const TrainerDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const data = await courseService.getCourses({ trainer: 'me' });
      setCourses(data || []);
    } catch (err) {
      console.error('Failed to load trainer courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const publishedCount = courses.filter((c) => c.status === 'published').length;
  const draftCount = courses.filter((c) => c.status === 'draft').length;
  const totalTrainees = courses.reduce((acc, c) => acc + (c.enrollment_count || 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Trainer Studio: ${user?.name || 'Faculty Trainer'}`}
        description="Author course materials, upload resources, manage MCQ banks, and monitor trainee completion."
        badge={<Badge variant="info">Trainer Portal</Badge>}
        action={
          <Link to="/trainer/courses/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Course
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Courses"
          value={courses.length}
          subtitle={`${publishedCount} Published · ${draftCount} Draft`}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          title="Total Trainees"
          value={totalTrainees}
          subtitle="Enrolled in your courses"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Trainer Rating"
          value="4.9"
          subtitle="From MoES Evaluations"
          icon={<Star className="h-5 w-5" />}
          trend="Top Faculty"
          trendPositive={true}
        />
        <StatCard
          title="Avg Pass Rate"
          value="92%"
          subtitle="Assessments passed"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">My Authored Courses</h2>
          <Link
            to="/trainer/courses"
            className="text-xs text-brand-400 font-semibold hover:underline flex items-center gap-1"
          >
            Manage all ({courses.length}) →
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading your authored courses...
          </div>
        ) : courses.length === 0 ? (
          <Card className="text-center py-12 border-dashed border-slate-700">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl w-12 h-12 mx-auto flex items-center justify-center mb-3 border border-brand-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Courses Authored Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Get started by creating your first course, uploading lecture PPTs/PDFs, and configuring auto-graded MCQ assessments.
            </p>
            <Link to="/trainer/courses/new" className="mt-4 inline-block">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Your First Course
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        course.status === 'published'
                          ? 'success'
                          : course.status === 'draft'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {course.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Enrolled: {course.enrollment_count || 0} Trainees
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {course.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                      {course.skill_name || 'General Skill'}
                    </span>
                    <span className="capitalize font-medium text-slate-300">
                      {course.difficulty} Level
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex items-center gap-2 border-t border-slate-800">
                  <Link to={`/trainer/courses/${course.id}/trainees`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full text-xs">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      Trainees
                    </Button>
                  </Link>
                  <Link to={`/trainer/courses/${course.id}/questions`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <HelpCircle className="h-3.5 w-3.5 mr-1" />
                      Question Bank
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
