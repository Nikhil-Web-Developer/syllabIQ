import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { CompetencyMatchResult, RankedTrainerMatch } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Sparkles,
  UserCheck,
  CheckCircle2,
  X,
  Award,
  BookOpen,
  Star,
  Clock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface SuggestedTrainersModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  currentTrainerId?: string;
  onTrainerAssigned?: (trainerId: string, trainerName: string) => void;
}

export const SuggestedTrainersModal: React.FC<SuggestedTrainersModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  currentTrainerId,
  onTrainerAssigned,
}) => {
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<CompetencyMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchRecommendations();
    }
  }, [isOpen, courseId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.matchTrainers({ course_id: courseId });
      setMatchResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to calculate trainer recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (trainer: RankedTrainerMatch) => {
    try {
      setAssigningId(trainer.trainerId);
      await adminService.assignCourseTrainer(courseId, trainer.trainerId);
      if (onTrainerAssigned) {
        onTrainerAssigned(trainer.trainerId, trainer.trainerName);
      }
      // Refresh matching to update current trainer
      await fetchRecommendations();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to assign trainer');
    } finally {
      setAssigningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="purple" size="sm">
                <Sparkles className="h-3 w-3 text-purple-400" />
                Formula-Ranked Recommendations
              </Badge>
              {matchResult?.skill && (
                <Badge variant="info" size="sm">
                  {matchResult.skill.name}
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">Suggested Faculty for: {courseTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked via Section 6 multi-factor competency engine (Proficiency 50% + Experience 20% + Past Ratings 20% + Prior Courses 10%)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-brand-500 mx-auto" />
              <p className="text-sm text-slate-400">Computing competency scores across faculty taxonomy...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : !matchResult || matchResult.trainers.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-950/40 rounded-xl border border-slate-800">
              <HelpCircle className="h-10 w-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-semibold text-slate-200">No Qualified Faculty Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No approved trainers have tagged the required subject skill ({matchResult?.skill?.name || 'this skill'}) in their competency profile yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchResult.trainers.map((trainer, index) => {
                const isAssigned = (matchResult.course?.trainerId || currentTrainerId) === trainer.trainerId;

                return (
                  <div
                    key={trainer.trainerId}
                    className={`p-5 rounded-xl border transition-all ${
                      isAssigned
                        ? 'bg-emerald-950/20 border-emerald-500/50'
                        : index === 0
                        ? 'bg-gradient-to-r from-slate-900 via-brand-950/30 to-slate-900 border-brand-500/50 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={index === 0 ? 'purple' : 'default'} size="sm">
                            Rank #{index + 1}
                          </Badge>
                          <Badge
                            variant={trainer.score >= 0.8 ? 'success' : trainer.score >= 0.5 ? 'info' : 'warning'}
                            size="sm"
                          >
                            Score: {trainer.score.toFixed(3)} ({trainer.scorePercentage}%)
                          </Badge>
                          {isAssigned && (
                            <Badge variant="success" size="sm">
                              <CheckCircle2 className="h-3 w-3" />
                              Currently Assigned
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white">{trainer.trainerName}</h4>
                          <p className="text-xs text-slate-400">{trainer.trainerEmail}</p>
                          {trainer.bio && (
                            <p className="text-xs text-slate-300 mt-1 line-clamp-1 italic">
                              "{trainer.bio}"
                            </p>
                          )}
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Proficiency (50%)</span>
                            <span className="text-slate-200 font-bold capitalize">{trainer.proficiencyLevel}</span>
                            <span className="text-[10px] text-slate-400 block">+{trainer.scoreBreakdown.proficiencyWeighted.toFixed(3)}</span>
                          </div>
                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Experience (20%)</span>
                            <span className="text-slate-200 font-bold">{trainer.yearsExperience} Years</span>
                            <span className="text-[10px] text-slate-400 block">+{trainer.scoreBreakdown.yearsExperienceWeighted.toFixed(3)}</span>
                          </div>
                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Avg Rating (20%)</span>
                            <span className="text-amber-400 font-bold">
                              {trainer.avgRating > 0 ? `${trainer.avgRating} ★` : 'No ratings'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">+{trainer.scoreBreakdown.avgRatingWeighted.toFixed(3)}</span>
                          </div>
                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Prior Courses (10%)</span>
                            <span className="text-slate-200 font-bold">{trainer.priorCoursesCount} Courses</span>
                            <span className="text-[10px] text-slate-400 block">+{trainer.scoreBreakdown.priorCoursesWeighted.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0 flex items-center justify-end">
                        {isAssigned ? (
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60">
                            <CheckCircle2 className="h-4 w-4" />
                            Assigned
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={assigningId === trainer.trainerId}
                            onClick={() => handleAssign(trainer)}
                          >
                            <UserCheck className="h-4 w-4" />
                            Assign Trainer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
