import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PublicProfileModal } from '../../components/public/PublicProfileModal';
import { courseService, Course } from '../../services/courseService';
import { profileService, Skill } from '../../services/profileService';
import {
  Search,
  Filter,
  BookOpen,
  Star,
  Clock,
  User,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const TraineeCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [viewingTrainerId, setViewingTrainerId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [coursesData, skillsData] = await Promise.all([
        courseService.getCourses(),
        profileService.getSkillsTaxonomy(),
      ]);
      setCourses(coursesData);
      setSkills(skillsData);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.trainer_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDifficulty =
      selectedDifficulty === 'all' || c.difficulty === selectedDifficulty;

    const matchesSkill =
      selectedSkill === 'all' ||
      c.skill_id === selectedSkill ||
      c.skill_name === selectedSkill ||
      c.skill_category === selectedSkill;

    return matchesSearch && matchesDifficulty && matchesSkill;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Course Catalog & Capacity Modules"
        description="Browse, filter, and self-enroll in specialized training modules across atmospheric and oceanic domains."
      />

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, description, or trainer..."
            className="w-full rounded-xl bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full rounded-xl bg-slate-900/80 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Difficulty Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="w-full rounded-xl bg-slate-900/80 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Subject Competencies</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading published courses...</div>
      ) : filteredCourses.length === 0 ? (
        <Card className="text-center py-16">
          <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No published courses found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or filter selections.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="flex flex-col justify-between hover:border-brand-500/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        course.difficulty === 'advanced'
                          ? 'purple'
                          : course.difficulty === 'intermediate'
                          ? 'info'
                          : 'default'
                      }
                    >
                      {course.difficulty.toUpperCase()}
                    </Badge>
                    {course.skill_category && (
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {course.skill_category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>{course.avg_rating ? course.avg_rating.toFixed(1) : '4.8'}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
                  {course.title}
                </h3>

                {course.skill_name && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-brand-400 font-medium">
                    <Sparkles className="h-3 w-3" />
                    <span>{course.skill_name}</span>
                  </div>
                )}

                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {course.description || 'Comprehensive training and operational capacity building module.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setViewingTrainerId(course.trainer_id)}
                    className="flex items-center gap-1.5 hover:text-brand-400 transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span className="underline decoration-dotted">{course.trainer_name}</span>
                  </button>
                  <span className="text-xs text-slate-400">
                    {course.enrollment_count || 0} enrolled
                  </span>
                </div>

                <Link to={`/trainee/courses/${course.id}`} className="block">
                  <Button className="w-full justify-center">
                    <span>View Course Details</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Trainer Profile Modal */}
      {viewingTrainerId && (
        <PublicProfileModal
          userId={viewingTrainerId}
          onClose={() => setViewingTrainerId(null)}
        />
      )}
    </div>
  );
};
