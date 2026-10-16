import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PublicProfileModal } from '../../components/public/PublicProfileModal';
import { courseService, TraineeParticipant } from '../../services/courseService';
import { assessmentService } from '../../services/assessmentService';
import {
  ChevronLeft,
  User,
  CheckCircle,
  Clock,
  BookOpen,
  AlertCircle,
  Award,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AttemptRow {
  attempt_id: string;
  score: number;
  passed: boolean;
  started_at: string;
  submitted_at: string | null;
  question_bank_id: string;
  assessment_title: string;
  pass_percentage: number;
  trainee_id: string;
  trainee_name: string;
  trainee_email: string;
}

export const TrainerTraineesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [courseTitle, setCourseTitle] = useState('Course');
  const [trainees, setTrainees] = useState<TraineeParticipant[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [activeTab, setActiveTab] = useState<'trainees' | 'scores'>('trainees');
  const [isLoading, setIsLoading] = useState(true);
  const [viewingTraineeId, setViewingTraineeId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (courseId: string) => {
    try {
      setIsLoading(true);
      const [enrollRes, attemptsRes] = await Promise.all([
        courseService.getCourseEnrollments(courseId),
        assessmentService.getCourseAttempts(courseId).catch(() => []),
      ]);
      setCourseTitle(enrollRes.courseTitle);
      setTrainees(enrollRes.enrollments);
      setAttempts(attemptsRes);
    } catch (err) {
      console.error('Failed to load course monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <Link to="/trainer/courses" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      <PageHeader
        title="Trainee Monitoring & Assessment Scores"
        description={`Track enrolled participants, module progress, and live quiz scores for: ${courseTitle}`}
      />

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('trainees')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'trainees'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          Enrolled Trainees ({trainees.length})
        </button>
        <button
          onClick={() => setActiveTab('scores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'scores'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="h-4 w-4" />
          Quiz Attempts &amp; Scores ({attempts.length})
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading data...</div>
      ) : activeTab === 'trainees' ? (
        trainees.length === 0 ? (
          <Card className="text-center py-16">
            <User className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Trainees Enrolled Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Once trainees self-enroll from the catalog, their progress and completion stats will appear here.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase border-b border-slate-700">
                <tr>
                  <th className="p-4">Trainee Scientist</th>
                  <th className="p-4">Enrolled Date</th>
                  <th className="p-4">Course Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {trainees.map((t) => (
                  <tr key={t.enrollment_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div>{t.trainee_name}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{t.trainee_email}</div>
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(t.enrolled_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white w-9">{t.progress_percent}%</span>
                        <div className="w-24 bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              t.progress_percent === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${t.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          t.status === 'completed'
                            ? 'success'
                            : t.status === 'dropped'
                            ? 'danger'
                            : 'info'
                        }
                      >
                        {t.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingTraineeId(t.trainee_id)}
                        className="text-xs"
                      >
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : (
        /* Scores & Attempts Tab */
        attempts.length === 0 ? (
          <Card className="text-center py-16">
            <Award className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Quiz Attempts Recorded Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              When enrolled students take the AI-generated quiz, their attempts, live scores, and pass/fail results will automatically populate here.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase border-b border-slate-700">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Assessment</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Result</th>
                  <th className="p-4">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {attempts.map((a) => (
                  <tr key={a.attempt_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div>{a.trainee_name}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{a.trainee_email}</div>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">
                      {a.assessment_title}
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold text-base text-white">
                        {a.score !== null && a.score !== undefined ? `${a.score}%` : 'In Progress'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Pass mark: {a.pass_percentage}%
                      </span>
                    </td>
                    <td className="p-4">
                      {a.submitted_at ? (
                        a.passed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="h-3.5 w-3.5" />
                            Failed
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="h-3.5 w-3.5" />
                          Attempt Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400">
                      {a.submitted_at ? (
                        <>
                          <div>{new Date(a.submitted_at).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(a.submitted_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-500 italic">Not submitted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {/* Trainee Profile Modal */}
      {viewingTraineeId && (
        <PublicProfileModal
          userId={viewingTraineeId}
          onClose={() => setViewingTraineeId(null)}
        />
      )}
    </div>
  );
};
