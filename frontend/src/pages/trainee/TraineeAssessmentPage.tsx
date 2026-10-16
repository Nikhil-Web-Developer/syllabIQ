import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  XCircle,
  FileCheck2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  assessmentService,
  Question,
  QuestionBank,
  AttemptResult,
} from '../../services/assessmentService';

type AssessmentState = 'landing' | 'active' | 'result';

export const TraineeAssessmentPage: React.FC = () => {
  const { id: courseId, qbId } = useParams<{ id: string; qbId: string }>();

  const [state, setState] = useState<AssessmentState>('landing');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Attempt & Quiz State
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800); // 30 mins default
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial Load: check if attempt already submitted or fetch bank info
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!courseId) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Fetch question banks to get details
        const banks = await assessmentService.getQuestionBanks(courseId);
        const currentBank = qbId ? banks.find((b) => b.id === qbId) : banks[0];

        if (currentBank) {
          setQuestionBank(currentBank);
          setSecondsRemaining(currentBank.time_limit_minutes * 60);

          // If trainee already submitted this assessment, show results directly
          if (currentBank.latestAttempt && currentBank.latestAttempt.submitted_at) {
            const res = await assessmentService.getAttemptResult(currentBank.latestAttempt.id);
            setResult(res);
            setState('result');
            setIsLoading(false);
            return;
          }
        } else {
          setErrorMessage(
            qbId
              ? 'This quiz link is no longer available. Return to the course page and select a current quiz.'
              : 'No quiz with questions is available for this course yet.',
          );
        }
      } catch (err: any) {
        console.error('Failed to load assessment:', err);
        setErrorMessage(err.response?.data?.message || 'Failed to load assessment information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [courseId, qbId]);

  // Timer countdown hook for active state
  useEffect(() => {
    if (state === 'active' && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const handleStartAssessment = async () => {
    const targetBankId = qbId || questionBank?.id;
    if (!targetBankId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await assessmentService.startAttempt(targetBankId);

      setAttemptId(data.attempt.id);
      setQuestions(data.questions || []);
      setQuestionBank(data.questionBank);
      setSecondsRemaining(data.questionBank.time_limit_minutes * 60);
      setCurrentQuestionIdx(0);
      setAnswers({});
      setState('active');
    } catch (err: any) {
      console.error('Failed to start attempt:', err);
      setErrorMessage(
        err.response?.status === 404
          ? 'This quiz is no longer available. Return to the course page and select a current quiz.'
          : err.response?.data?.message ||
          'Failed to initialize assessment attempt. Please verify enrollment.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleAutoSubmit = async () => {
    if (!attemptId) return;
    await executeSubmission();
  };

  const executeSubmission = async () => {
    if (!attemptId) return;
    try {
      setIsSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      await assessmentService.submitAttempt(attemptId, answers);
      const fullResult = await assessmentService.getAttemptResult(attemptId);
      setResult(fullResult);
      setState('result');
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      console.error('Failed to submit attempt:', err);
      setErrorMessage(err.response?.data?.message || 'Error submitting assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        Loading Assessment Portal...
      </div>
    );
  }

  if (errorMessage && state === 'landing') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12">
        <Card className="text-center py-10 space-y-4 border-rose-500/40 bg-rose-950/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Access Restricted</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {errorMessage}
          </p>
          <div className="pt-2">
            <Link to={`/trainee/courses/${courseId}`}>
              <Button variant="secondary">Back to Course Page</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // STATE 1: PRE-ASSESSMENT LANDING SCREEN
  // =========================================================================
  if (state === 'landing') {
    return (
      <div className="space-y-8 max-w-3xl mx-auto pb-12">
        <Link
          to={`/trainee/courses/${courseId}`}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Course Overview
        </Link>

        <PageHeader
          title={questionBank?.title || 'MCQ Certification Assessment'}
          description="Test your conceptual understanding and practical mastery. Passing this assessment awards an official MoES Certificate of Completion."
          badge={<Badge variant="info">Automated Grading</Badge>}
        />

        {/* Assessment Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-4 bg-slate-900/70 border-slate-800">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Duration</p>
              <p className="text-base font-black text-white">
                {questionBank?.time_limit_minutes || 30} Minutes
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 bg-slate-900/70 border-slate-800">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Passing Grade</p>
              <p className="text-base font-black text-white">
                {questionBank?.pass_percentage || 60}% Required
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 bg-slate-900/70 border-slate-800">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Question Format</p>
              <p className="text-base font-black text-white">Single Choice MCQ</p>
            </div>
          </Card>
        </div>

        {/* Instructions Card */}
        <Card className="space-y-4 bg-slate-900/40">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-brand-400" />
            Assessment Guidelines & Security Rules
          </h3>
          <ul className="text-xs text-slate-300 space-y-2.5 list-disc list-inside leading-relaxed">
            <li>
              Once you click <strong>"Begin Timed Assessment"</strong>, the timer starts immediately and cannot be paused.
            </li>
            <li>
              Questions are delivered securely; correct answers and detailed explanations will be revealed immediately upon final submission.
            </li>
            <li>
              If the timer runs out before manual submission, all answered questions will be automatically evaluated.
            </li>
            <li>
              Achieving a score of <strong>{questionBank?.pass_percentage || 60}%</strong> or above will mark your course as 100% completed and generate your digital certificate.
            </li>
          </ul>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button onClick={handleStartAssessment} className="px-8 flex items-center gap-2">
              <span>Begin Timed Assessment</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: ACTIVE TIMED QUIZ INTERFACE
  // =========================================================================
  if (state === 'active') {
    const currentQ = questions[currentQuestionIdx];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const isUrgent = secondsRemaining < 180; // less than 3 mins

    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16">
        {/* Sticky Top Status Bar */}
        <div className="sticky top-16 z-30 flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {questionBank?.title || 'Assessment'}
            </span>
            <span className="text-xs text-slate-400">
              • Question {currentQuestionIdx + 1} of {totalQuestions}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
              isUrgent
                ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-950 border-slate-700 text-amber-400'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Question Card */}
        {currentQ ? (
          <Card className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 text-xs font-bold font-mono">
                  {currentQuestionIdx + 1}
                </span>
                <span className="text-xs text-slate-400 font-semibold">Single Choice</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>

            {/* Question Text */}
            <p className="text-base font-semibold text-white leading-relaxed">
              {currentQ.text}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentQ.id] === opt.id;
                const letter = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, opt.id)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-950/40 text-brand-200 font-semibold shadow-lg shadow-brand-500/10'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono font-bold ${
                          isSelected
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {letter}
                      </span>
                      <span>{opt.text}</span>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-brand-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Question Dots */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] px-2 py-1">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIdx;
                  const isAnswered = !!answers[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        isCurrent
                          ? 'w-6 bg-brand-500'
                          : isAnswered
                          ? 'w-2.5 bg-emerald-500'
                          : 'w-2.5 bg-slate-700'
                      }`}
                      title={`Jump to question ${idx + 1}`}
                    />
                  );
                })}
              </div>

              {currentQuestionIdx < totalQuestions - 1 ? (
                <Button
                  onClick={() =>
                    setCurrentQuestionIdx((p) => Math.min(totalQuestions - 1, p + 1))
                  }
                  className="flex items-center gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-6 font-bold"
                >
                  Finish Assessment
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="text-center py-12 text-slate-400">
            No questions available in this bank.
          </Card>
        )}

        {/* Confirmation Modal */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Submit Assessment?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    You have answered {answeredCount} of {totalQuestions} questions.
                  </p>
                </div>
              </div>

              {answeredCount < totalQuestions && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                  Warning: You have {totalQuestions - answeredCount} unanswered questions remaining.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setIsConfirmModalOpen(false)}
                >
                  Review Answers
                </Button>
                <Button
                  onClick={executeSubmission}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {isSubmitting ? 'Evaluating Score...' : 'Confirm Submission'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STATE 3: RESULT & COMPREHENSIVE QUESTION REVIEW
  // =========================================================================
  if (state === 'result' && result) {
    const isPassed = result.passed;
    const totalQ = result.questions?.length || 0;
    let correctTally = 0;

    result.questions?.forEach((q) => {
      if (result.answers?.[q.id] === q.correct_option_id) {
        correctTally++;
      }
    });

    return (
      <div className="space-y-8 max-w-3xl mx-auto pb-16">
        <Link
          to={`/trainee/courses/${courseId}`}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Course Overview
        </Link>

        {/* Result Hero Banner */}
        <Card
          className={`text-center py-10 space-y-4 border ${
            isPassed
              ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-900'
              : 'border-rose-500/40 bg-gradient-to-b from-rose-950/30 to-slate-900'
          }`}
        >
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${
              isPassed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {isPassed ? <Award className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          </div>

          <Badge variant={isPassed ? 'success' : 'danger'} className="text-xs py-1 px-3">
            {isPassed ? `PASSED (${result.score}% Score)` : `FAILED (${result.score}% Score)`}
          </Badge>

          <h2 className="text-2xl font-black text-white">
            {isPassed ? 'Assessment Completed Successfully!' : 'Passing Criteria Not Met'}
          </h2>

          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {isPassed
              ? `Congratulations! You scored ${result.score}%, exceeding the required ${result.pass_percentage}% threshold. Your official Certificate of Completion has been generated and added to your portfolio.`
              : `You scored ${result.score}%. The required passing grade is ${result.pass_percentage}%. Review the explanations below to reinforce your understanding and consult your trainer for re-assessment.`}
          </p>

          <div className="pt-4 flex justify-center gap-4">
            {isPassed && (
              <Link to="/trainee/certificates">
                <Button className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>View My Certificate</span>
                </Button>
              </Link>
            )}
            <Link to={`/trainee/courses/${courseId}`}>
              <Button variant="secondary">Back to Course</Button>
            </Link>
          </div>
        </Card>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Detailed Question Review & Explanations ({totalQ})
          </h3>

          {result.questions?.map((q, idx) => {
            const traineeAnswer = result.answers?.[q.id];
            const isCorrect = traineeAnswer === q.correct_option_id;

            return (
              <Card key={q.id} className="space-y-4">
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-slate-300 text-xs font-bold font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Question Review</span>
                  </div>

                  <Badge variant={isCorrect ? 'success' : 'danger'}>
                    {isCorrect ? 'Correct (+100%)' : 'Incorrect (0%)'}
                  </Badge>
                </div>

                <p className="text-sm text-white font-medium leading-relaxed">
                  {q.text}
                </p>

                {/* Option Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, optIdx) => {
                    const isKey = opt.id === q.correct_option_id;
                    const isUserChoice = opt.id === traineeAnswer;
                    const letter = String.fromCharCode(65 + optIdx);

                    let cardStyle = 'bg-slate-900/60 border-slate-800 text-slate-400';
                    if (isKey) {
                      cardStyle =
                        'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold';
                    } else if (isUserChoice && !isCorrect) {
                      cardStyle =
                        'bg-rose-950/40 border-rose-500/50 text-rose-200 line-through opacity-90';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${cardStyle}`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isKey ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {letter}.
                          </span>
                          <span>{opt.text}</span>
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUserChoice && !isCorrect && (
                            <Badge variant="danger" className="text-[10px] py-0.5 px-1.5">
                              Your Choice
                            </Badge>
                          )}
                          {isKey && (
                            <Badge variant="success" className="text-[10px] py-0.5 px-1.5">
                              {isUserChoice ? 'Your Choice ✓' : 'Correct Answer'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Card */}
                {q.explanation && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                    <span className="font-semibold text-brand-300">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
