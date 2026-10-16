import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PublicProfileModal } from '../../components/public/PublicProfileModal';
import { courseService, Course, CourseResource } from '../../services/courseService';
import { assessmentService, QuestionBank } from '../../services/assessmentService';
import {
  FileText,
  Video,
  Download,
  CheckCircle,
  HelpCircle,
  Clock,
  Award,
  ChevronLeft,
  Lock,
  ExternalLink,
  Presentation,
  FileCode,
  User,
  Sparkles,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { CourseAiChatbot } from '../../components/ui/CourseAiChatbot';

export const TraineeCourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [viewingTrainerId, setViewingTrainerId] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCourseDetail(id);
    }
  }, [id]);

  const loadCourseDetail = async (courseId: string) => {
    try {
      setIsLoading(true);
      const data = await courseService.getCourseById(courseId);
      setCourse(data);

      if (data.userEnrollment) {
        setProgressPercent(data.userEnrollment.progress_percent || 0);
        // Load secure resources
        try {
          const resData = await courseService.getResources(courseId);
          setResources(resData);
        } catch (resErr) {
          console.error('Failed to load resources:', resErr);
        }
      }

      // Load question banks for course
      try {
        const banks = await assessmentService.getQuestionBanks(courseId);
        setQuestionBanks(banks);
      } catch (bankErr) {
        console.error('Failed to load question banks:', bankErr);
      }
    } catch (err) {
      console.error('Failed to load course details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!id || !course) return;
    try {
      setIsEnrolling(true);
      await courseService.enrollCourse(id);
      showToast('Successfully enrolled! Lecture resources are now unlocked.');
      await loadCourseDetail(id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to enroll in course');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleProgressChange = async (newProgress: number) => {
    if (!course?.userEnrollment?.id) return;
    try {
      setIsUpdatingProgress(true);
      setProgressPercent(newProgress);
      await courseService.updateProgress(course.userEnrollment.id, newProgress);
      showToast(`Progress updated to ${newProgress}%`);
      if (newProgress === 100) {
        showToast('Congratulations! You have completed all learning modules.');
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5 text-blue-400" />;
      case 'ppt':
        return <Presentation className="h-5 w-5 text-amber-400" />;
      case 'doc':
        return <FileCode className="h-5 w-5 text-emerald-400" />;
      case 'link':
        return <ExternalLink className="h-5 w-5 text-indigo-400" />;
      default:
        return <FileText className="h-5 w-5 text-rose-400" />;
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">Loading course syllabus and resources...</div>;
  }

  if (!course) {
    return (
      <Card className="text-center py-16">
        <h3 className="text-base font-bold text-white">Course Not Found</h3>
        <p className="text-xs text-slate-400 mt-2">The requested training course does not exist or is unavailable.</p>
        <Link to="/trainee/courses" className="mt-4 inline-block">
          <Button variant="secondary">Back to Catalog</Button>
        </Link>
      </Card>
    );
  }

  const isEnrolled = !!course.userEnrollment;

  return (
    <div className="space-y-8 max-w-5xl">
      <Link to="/trainee/courses" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" />
        Back to Catalog
      </Link>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-200 text-sm font-medium flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-brand-400 hover:text-white">✕</button>
        </div>
      )}

      <PageHeader
        title={course.title}
        description={course.description || 'Specialized capacity building module under Ministry of Earth Sciences.'}
        badge={
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
        }
        action={
          isEnrolled ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-emerald-400 text-xs font-semibold">
              <CheckCircle className="h-4 w-4" />
              <span>Enrolled ({course.userEnrollment?.status?.toUpperCase()})</span>
            </div>
          ) : (
            <Button onClick={handleEnroll} disabled={isEnrolling} className="shadow-lg shadow-brand-500/20">
              <Sparkles className="h-4 w-4" />
              <span>{isEnrolling ? 'Enrolling...' : 'Enroll in Course'}</span>
            </Button>
          )
        }
      />

      {/* Trainee Progress Bar (when enrolled) */}
      {isEnrolled && (
        <Card className="bg-slate-900/90 border-brand-500/30 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Course Progress &amp; Completion</span>
                <span className="text-xs text-brand-400 font-mono">({progressPercent}%)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Update your progress as you complete lecture modules and readings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={progressPercent === 25 ? 'primary' : 'secondary'}
                onClick={() => handleProgressChange(25)}
                disabled={isUpdatingProgress}
              >
                25%
              </Button>
              <Button
                size="sm"
                variant={progressPercent === 50 ? 'primary' : 'secondary'}
                onClick={() => handleProgressChange(50)}
                disabled={isUpdatingProgress}
              >
                50%
              </Button>
              <Button
                size="sm"
                variant={progressPercent === 75 ? 'primary' : 'secondary'}
                onClick={() => handleProgressChange(75)}
                disabled={isUpdatingProgress}
              >
                75%
              </Button>
              <Button
                size="sm"
                variant={progressPercent === 100 ? 'primary' : 'secondary'}
                onClick={() => handleProgressChange(100)}
                disabled={isUpdatingProgress}
              >
                100% Complete
              </Button>
            </div>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-brand-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content & Resources */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-white">Course Overview &amp; Curriculum</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {course.description ||
                'This course equips Ministry officers and scientists with operational knowledge of meteorological and oceanographic frameworks, data assimilation, dynamic modeling, and post-processing verification metrics.'}
            </p>

            <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Instructor: </span>
                <button
                  type="button"
                  onClick={() => setViewingTrainerId(course.trainer_id)}
                  className="text-brand-400 font-semibold underline decoration-dotted hover:text-white"
                >
                  {course.trainer_name}
                </button>
              </div>
              {course.skill_name && (
                <div>
                  <span className="text-slate-500">Competency Tag: </span>
                  <span className="text-slate-200 font-semibold">{course.skill_name}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500">Total Enrolled: </span>
                <span className="text-slate-200 font-semibold">{course.enrollment_count || 0} scientists</span>
              </div>
            </div>
          </Card>

          {/* Learning Resources */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Lecture Handouts &amp; Resource Materials</h2>
              <span className="text-xs text-slate-400">{resources.length} materials</span>
            </div>

            {!isEnrolled ? (
              <Card className="p-8 text-center space-y-3 bg-slate-900/60 border-dashed border-slate-700">
                <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Learning Materials Protected</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Lecture slide decks, research papers, and tutorial code are protected. Enroll in this course to access all downloadable materials via secure signed URLs.
                </p>
                <Button onClick={handleEnroll} disabled={isEnrolling} className="mt-2">
                  <Sparkles className="h-4 w-4" />
                  <span>{isEnrolling ? 'Enrolling...' : 'Enroll to Unlock Materials'}</span>
                </Button>
              </Card>
            ) : resources.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-400">
                No lecture handouts uploaded by instructor yet.
              </Card>
            ) : (
              <div className="space-y-3">
                {resources.map((res) => (
                  <Card
                    key={res.id}
                    className="flex items-center justify-between p-4 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl">
                        {getResourceIcon(res.type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{res.title}</h3>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                          {res.type.toUpperCase()} · Added{' '}
                          {new Date(res.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {res.signed_url ? (
                      <a
                        href={res.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
                      >
                        {res.type === 'link' ? (
                          <>
                            <span>Visit Link</span>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5 text-brand-400" />
                            <span>Download</span>
                          </>
                        )}
                      </a>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Assessments & Instructor Info */}
        <div className="space-y-6">
          <div className="space-y-4">
            {questionBanks.length > 0 ? (
              questionBanks.map((bank) => (
                <Card
                  key={bank.id}
                  className="space-y-4 border-brand-500/30 bg-gradient-to-b from-brand-950/20 to-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-brand-400">
                      <HelpCircle className="h-5 w-5 shrink-0" />
                      <h2 className="text-base font-bold text-white">{bank.title}</h2>
                    </div>
                    {bank.latestAttempt?.passed && (
                      <Badge variant="success" className="text-[10px]">Passed</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-xs text-slate-400 border-t border-slate-700/60 pt-3">
                    <div className="flex justify-between">
                      <span>Passing Threshold:</span>
                      <span className="font-semibold text-white">{bank.pass_percentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Limit:</span>
                      <span className="font-semibold text-white">{bank.time_limit_minutes} Minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions:</span>
                      <span className="font-semibold text-white">{bank.question_count ?? 0}</span>
                    </div>
                    {bank.latestAttempt?.submitted_at && (
                      <div className="flex justify-between">
                        <span>Latest Score:</span>
                        <span className="font-semibold text-white">{bank.latestAttempt.score}%</span>
                      </div>
                    )}
                  </div>

                  {isEnrolled ? (
                    <Link
                      to={`/trainee/courses/${course.id}/assessment/${bank.id}`}
                      className="block"
                    >
                      <Button className="w-full justify-center">
                        <Award className="h-4 w-4 mr-1.5" />
                        {bank.latestAttempt?.submitted_at ? 'View Assessment Results' : 'Take Assessment'}
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled variant="secondary" className="w-full justify-center opacity-60">
                      Enroll to Unlock Test
                    </Button>
                  )}
                </Card>
              ))
            ) : (
              <Card className="space-y-4 border-brand-500/30 bg-gradient-to-b from-brand-950/20 to-slate-900">
                <div className="flex items-center gap-2 text-brand-400">
                  <HelpCircle className="h-5 w-5" />
                  <h2 className="text-base font-bold text-white">Module Assessment</h2>
                </div>
                <p className="text-xs text-slate-300">
                  The trainer has not published a quiz with questions for this course yet.
                </p>
                {!isEnrolled && (
                  <Button disabled variant="secondary" className="w-full justify-center opacity-60">
                    Enroll to Unlock Test
                  </Button>
                )}
              </Card>
            )}
          </div>

          {/* Instructor Bio Card */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-bold text-white">Faculty Lead</h3>
            </div>
            <p className="text-xs font-semibold text-white">{course.trainer_name}</p>
            <p className="text-xs text-slate-400">
              Ministry certified trainer and scientific capacity building expert.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewingTrainerId(course.trainer_id)}
              className="w-full justify-center text-xs"
            >
              View Full Faculty Bio
            </Button>
          </Card>
        </div>
      </div>

      {/* Instructor Public Profile Modal */}
      {viewingTrainerId && (
        <PublicProfileModal
          userId={viewingTrainerId}
          onClose={() => setViewingTrainerId(null)}
        />
      )}

      {isEnrolled && id && course && (
        <CourseAiChatbot courseId={id} courseTitle={course.title} />
      )}
    </div>
  );
};
