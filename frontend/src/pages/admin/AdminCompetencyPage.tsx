import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { adminService, AdminUser } from '../../services/adminService';
import { courseService, Course } from '../../services/courseService';
import { CompetencyMatchResult, RankedTrainerMatch, Skill } from '../../types';
import {
  Sparkles,
  UserCheck,
  CheckCircle2,
  BookOpen,
  Award,
  Star,
  Clock,
  Layers,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  UserX,
  RefreshCw,
} from 'lucide-react';

export const AdminCompetencyPage: React.FC = () => {
  // Mode selection
  const [matchMode, setMatchMode] = useState<'course' | 'skill'>('course');

  // Master Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allTrainers, setAllTrainers] = useState<AdminUser[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selected Entities
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');

  // Results & States
  const [matchResult, setMatchResult] = useState<CompetencyMatchResult | null>(null);
  const [loadingMatch, setLoadingMatch] = useState<boolean>(false);
  const [assigningTrainerId, setAssigningTrainerId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideTrainerId, setOverrideTrainerId] = useState<string>('');
  const [overrideSubmitting, setOverrideSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingInitial(true);
      const [coursesData, skillsData, trainersData] = await Promise.all([
        courseService.getCourses(),
        adminService.getSkillsTaxonomy(),
        adminService.getUsers({ role: 'trainer', status: 'approved' }),
      ]);

      setCourses(coursesData);
      setSkills(skillsData);
      setAllTrainers(trainersData);

      if (coursesData.length > 0) {
        setSelectedCourseId(coursesData[0].id);
      }
      if (skillsData.length > 0) {
        setSelectedSkillId(skillsData[0].id);
      }
    } catch (err: any) {
      setErrorMessage('Failed to load initial taxonomy and course catalog');
    } finally {
      setLoadingInitial(false);
    }
  };

  // Trigger matching algorithm when selection or mode changes
  useEffect(() => {
    if (loadingInitial) return;

    if (matchMode === 'course' && selectedCourseId) {
      runMatching({ course_id: selectedCourseId });
    } else if (matchMode === 'skill' && selectedSkillId) {
      runMatching({ skill_id: selectedSkillId });
    }
  }, [matchMode, selectedCourseId, selectedSkillId, loadingInitial]);

  const runMatching = async (params: { course_id?: string; skill_id?: string }) => {
    try {
      setLoadingMatch(true);
      setErrorMessage(null);
      const result = await adminService.matchTrainers(params);
      setMatchResult(result);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to execute matching engine');
      setMatchResult(null);
    } finally {
      setLoadingMatch(false);
    }
  };

  const handleAssignTrainer = async (trainerId: string, trainerName: string) => {
    if (!selectedCourseId) return;

    try {
      setAssigningTrainerId(trainerId);
      setErrorMessage(null);
      const res = await adminService.assignCourseTrainer(selectedCourseId, trainerId);

      setSuccessMessage(`Course successfully assigned to ${trainerName}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh course list and match results
      const updatedCourses = await courseService.getCourses();
      setCourses(updatedCourses);
      await runMatching({ course_id: selectedCourseId });
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to assign trainer to course');
    } finally {
      setAssigningTrainerId(null);
    }
  };

  const handleManualOverride = async () => {
    if (!selectedCourseId || !overrideTrainerId) return;

    const trainer = allTrainers.find((t) => t.id === overrideTrainerId);
    const trainerName = trainer ? trainer.name : 'Selected Trainer';

    try {
      setOverrideSubmitting(true);
      setErrorMessage(null);
      await adminService.assignCourseTrainer(selectedCourseId, overrideTrainerId);

      setSuccessMessage(`Manual Override: Course assigned to ${trainerName}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      setShowOverrideModal(false);
      const updatedCourses = await courseService.getCourses();
      setCourses(updatedCourses);
      await runMatching({ course_id: selectedCourseId });
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to execute manual trainer override');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const selectedSkill = skills.find((s) => s.id === selectedSkillId);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <PageHeader
        title="Competency Mapping & Trainer Matching Engine"
        description="Automated multi-factor algorithm ranking qualified trainers by proficiency level, years of experience, prior course ratings, and domain overlap."
        badge={<Badge variant="purple">SIH26076 Core Differentiator</Badge>}
      />

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-sm flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-rose-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selection & Controls Card */}
      <Card className="p-6 space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Matching Context & Target
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select whether to match faculty for an existing course module or explore qualified candidates for a raw skill taxonomy topic.
            </p>
          </div>

          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
            <button
              onClick={() => setMatchMode('course')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                matchMode === 'course'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Match by Course Module
            </button>
            <button
              onClick={() => setMatchMode('skill')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                matchMode === 'skill'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Match by Skill Taxonomy
            </button>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matchMode === 'course' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Target Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={loadingInitial || courses.length === 0}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-xs text-slate-100 focus:border-brand-500 focus:outline-none transition disabled:opacity-50"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({course.skill_name || 'No tagged skill'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Skill Taxonomy Topic
              </label>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                disabled={loadingInitial || skills.length === 0}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-xs text-slate-100 focus:border-brand-500 focus:outline-none transition disabled:opacity-50"
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    [{skill.category}] {skill.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Context Summary */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Target Subject Skill
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-brand-300">
                  {matchMode === 'course'
                    ? selectedCourse?.skill_name || matchResult?.skill?.name || 'Unassigned Skill'
                    : selectedSkill?.name || 'Select a skill'}
                </span>
                {(selectedCourse?.skill_category || matchResult?.skill?.category) && (
                  <Badge variant="info" size="sm">
                    {selectedCourse?.skill_category || matchResult?.skill?.category}
                  </Badge>
                )}
              </div>
            </div>

            {matchMode === 'course' && selectedCourse && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Current Faculty:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedCourse.trainer_name || 'Unassigned'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] py-1 px-2.5 h-auto"
                  onClick={() => setShowOverrideModal(true)}
                >
                  Override / Custom Trainer
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Formula Transparency Banner */}
      <div className="bg-gradient-to-r from-brand-950/40 via-slate-900 to-purple-950/40 border border-brand-800/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Section 6 Weighted Faculty Fit Formula (V1 Algorithm)
            </h3>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Score = (Proficiency Level × 0.50) + (Experience Normalized × 0.20) + (Past Rating in Skill × 0.20) + (Prior Courses in Skill × 0.10)
            </p>
          </div>
        </div>
        <Badge variant="purple" size="sm" className="shrink-0 self-start md:self-auto">
          Scale: 0.000 — 1.000
        </Badge>
      </div>

      {/* Ranked Candidate Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Ranked Faculty Candidates
            </h2>
            {matchResult && (
              <Badge variant="default" size="sm">
                {matchResult.trainers.length} qualified
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (matchMode === 'course' && selectedCourseId) runMatching({ course_id: selectedCourseId });
              else if (matchMode === 'skill' && selectedSkillId) runMatching({ skill_id: selectedSkillId });
            }}
            disabled={loadingMatch}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingMatch ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>

        {loadingMatch ? (
          <Card className="p-12 text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-200">Evaluating Faculty Competency Taxonomy</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Aggregating verified proficiency levels, years of domain experience, trainee course feedback ratings, and historical course volume...
            </p>
          </Card>
        ) : !matchResult || matchResult.trainers.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Qualified Faculty Candidates Tagged</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {matchResult?.message ||
                  'No approved trainers have tagged this subject skill in their profile yet. You can use the manual override option to assign any faculty member.'}
              </p>
            </div>
            {matchMode === 'course' && (
              <Button size="sm" variant="secondary" onClick={() => setShowOverrideModal(true)}>
                Manually Select Faculty Member
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {matchResult.trainers.map((trainer, index) => {
              const isAssignedToCourse =
                matchMode === 'course' &&
                (matchResult.course?.trainerId === trainer.trainerId ||
                  selectedCourse?.trainer_id === trainer.trainerId);

              const breakdown = trainer.scoreBreakdown;

              return (
                <Card
                  key={trainer.trainerId}
                  className={`p-6 transition-all relative overflow-hidden ${
                    isAssignedToCourse
                      ? 'border-emerald-500/60 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 shadow-xl'
                      : index === 0
                      ? 'border-brand-500/60 bg-gradient-to-r from-slate-900 via-brand-950/30 to-slate-900 shadow-xl ring-1 ring-brand-500/30'
                      : 'hover:border-slate-700 bg-slate-900/70'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Candidate Details & Metrics */}
                    <div className="space-y-4 flex-1">
                      {/* Candidate Header Badges */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge
                          variant={index === 0 ? 'purple' : 'default'}
                          size="md"
                          className="font-bold"
                        >
                          Rank #{index + 1}
                        </Badge>
                        <Badge
                          variant={
                            trainer.score >= 0.8
                              ? 'success'
                              : trainer.score >= 0.5
                              ? 'info'
                              : 'warning'
                          }
                          size="md"
                          className="font-bold text-xs"
                        >
                          Match Score: {trainer.score.toFixed(3)} ({trainer.scorePercentage}%)
                        </Badge>
                        {isAssignedToCourse && (
                          <Badge variant="success" size="md">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Currently Assigned Faculty
                          </Badge>
                        )}
                        {trainer.skillSource && (
                          <Badge variant="default" size="sm" className="capitalize text-[11px]">
                            Source: {trainer.skillSource.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>

                      {/* Candidate Name & Bio */}
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {trainer.trainerName}
                        </h3>
                        <p className="text-xs text-slate-400">{trainer.trainerEmail}</p>
                        {trainer.bio && (
                          <p className="text-xs text-slate-300 mt-1.5 italic line-clamp-2">
                            "{trainer.bio}"
                          </p>
                        )}
                      </div>

                      {/* 4-Component Visual Breakdown Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Component 1: Proficiency */}
                        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                            <span>1. Proficiency (50%)</span>
                            <span className="text-brand-300 font-mono">
                              +{breakdown.proficiencyWeighted.toFixed(3)}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white capitalize flex items-center justify-between">
                            <span>{trainer.proficiencyLevel}</span>
                            <span className="text-xs font-normal text-slate-400">
                              wt: {breakdown.proficiencyLevelWeight.toFixed(2)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{
                                width: `${(breakdown.proficiencyLevelWeight / 1.0) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Component 2: Experience */}
                        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                            <span>2. Experience (20%)</span>
                            <span className="text-emerald-400 font-mono">
                              +{breakdown.yearsExperienceWeighted.toFixed(3)}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white flex items-center justify-between">
                            <span>{trainer.yearsExperience} Years</span>
                            <span className="text-xs font-normal text-slate-400">
                              norm: {breakdown.yearsExperienceNormalized.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${breakdown.yearsExperienceNormalized * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Component 3: Past Rating */}
                        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                            <span>3. Past Rating (20%)</span>
                            <span className="text-amber-400 font-mono">
                              +{breakdown.avgRatingWeighted.toFixed(3)}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-amber-400 flex items-center justify-between">
                            <span>{trainer.avgRating > 0 ? `${trainer.avgRating} ★` : '0.0 ★'}</span>
                            <span className="text-xs font-normal text-slate-400">
                              norm: {breakdown.avgRatingNormalized.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{
                                width: `${breakdown.avgRatingNormalized * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Component 4: Prior Courses */}
                        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                            <span>4. Prior Courses (10%)</span>
                            <span className="text-purple-400 font-mono">
                              +{breakdown.priorCoursesWeighted.toFixed(3)}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white flex items-center justify-between">
                            <span>{trainer.priorCoursesCount} Courses</span>
                            <span className="text-xs font-normal text-slate-400">
                              norm: {breakdown.priorCoursesNormalized.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{
                                width: `${breakdown.priorCoursesNormalized * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Formula String Transparency Pill */}
                      <div className="text-[11px] text-slate-400 font-mono bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60 inline-flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500">Formula:</span>
                        <span>({breakdown.proficiencyLevelWeight.toFixed(2)} × 0.5)</span>
                        <span>+</span>
                        <span>({breakdown.yearsExperienceNormalized.toFixed(2)} × 0.2)</span>
                        <span>+</span>
                        <span>({breakdown.avgRatingNormalized.toFixed(2)} × 0.2)</span>
                        <span>+</span>
                        <span>({breakdown.priorCoursesNormalized.toFixed(2)} × 0.1)</span>
                        <span>=</span>
                        <span className="font-bold text-brand-300">{trainer.score.toFixed(3)}</span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 min-w-[160px]">
                      {matchMode === 'course' && (
                        <>
                          {isAssignedToCourse ? (
                            <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              Assigned Faculty
                            </div>
                          ) : (
                            <Button
                              size="md"
                              variant="primary"
                              isLoading={assigningTrainerId === trainer.trainerId}
                              onClick={() => handleAssignTrainer(trainer.trainerId, trainer.trainerName)}
                              className="w-full shadow-lg"
                            >
                              <UserCheck className="h-4 w-4" />
                              Assign to Course
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-400" />
                Manual Trainer Assignment Override
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Admins always retain full human oversight. Select any approved trainer from the faculty registry to override formula suggestions.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Faculty Member
              </label>
              <select
                value={overrideTrainerId}
                onChange={(e) => setOverrideTrainerId(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="">-- Choose a Trainer --</option>
                {allTrainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email}) - {t.years_experience ?? 0} yrs exp
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOverrideModal(false)}
                disabled={overrideSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={overrideSubmitting}
                disabled={!overrideTrainerId}
                onClick={handleManualOverride}
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
