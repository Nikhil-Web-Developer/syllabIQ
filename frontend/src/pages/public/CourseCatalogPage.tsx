import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  BookOpen,
  Search,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { courseService, Course } from '../../services/courseService';
import { profileService, Skill } from '../../services/profileService';

export const CourseCatalogPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  // Fetch courses
  const { data: courses = [], isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ['public-catalog-courses'],
    queryFn: () => courseService.getCourses(),
  });

  // Fetch skills taxonomy for category filtering
  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['skills-taxonomy'],
    queryFn: () => profileService.getSkills(),
  });

  const categories = Array.from(new Set(skills.map((s) => s.category))).filter(Boolean);

  const publishedCourses = courses.filter((c) => c.status === 'published');

  const filteredCourses = publishedCourses.filter((course) => {
    const matchesSearch =
      !searchQuery ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.trainer_name && course.trainer_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || course.skill_category === selectedCategory;

    const matchesDifficulty =
      selectedDifficulty === 'all' || course.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="space-y-8 max-w-6xl animate-fade-in">
      <PageHeader
        title="Ministry Scientific Course Catalog"
        description="Comprehensive directory of capacity building modules across Atmospheric Sciences, Ocean Dynamics, Climate Modeling, and Seismology."
        badge={<Badge variant="purple">Public Catalog</Badge>}
      />

      {/* Filter and Search Bar */}
      <div className="space-y-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search courses by title, topic, or trainer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 text-xs text-white px-3.5 py-2.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Disciplines</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-950 text-xs text-white px-3.5 py-2.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loadingCourses ? (
        <div className="py-24 text-center text-slate-500 text-sm animate-pulse">
          Loading course catalog...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-24 text-center text-slate-500 text-sm bg-slate-900/40 rounded-3xl border border-slate-800">
          No courses match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="flex flex-col justify-between hover:border-brand-500/40 transition-all group bg-gradient-to-b from-slate-900/90 to-slate-900/60 shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="success">Published</Badge>
                  <span className="text-xs text-slate-400 capitalize font-medium">
                    {course.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
                  {course.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {course.description || 'Comprehensive training module in Earth System Sciences.'}
                </p>

                {course.skill_name && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      <Sparkles className="h-3 w-3" />
                      {course.skill_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Faculty Lead</span>
                  <strong className="text-white font-medium">{course.trainer_name || 'Senior Scientist'}</strong>
                </div>

                <Link to={`/trainee/courses`}>
                  <Button size="sm" className="shadow-md shadow-brand-500/20">
                    Enroll
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
