import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Plus,
  HelpCircle,
  CheckCircle,
  ChevronLeft,
  Trash2,
  Clock,
  Award,
  BookOpen,
  Settings2,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  assessmentService,
  QuestionBank,
  Question,
  CreateQuestionDto,
} from '../../services/assessmentService';
import { AIQuizGeneratorModal } from '../../components/ui/AIQuizGeneratorModal';

export const TrainerQuestionsPage: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();

  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [activeBank, setActiveBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Modal States
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Bank Form State
  const [bankTitle, setBankTitle] = useState('Final MCQ Certification Assessment');
  const [bankPassPercentage, setBankPassPercentage] = useState(60);
  const [bankTimeLimit, setBankTimeLimit] = useState(30);

  // Question Form State
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { id: 'opt_a', text: '' },
    { id: 'opt_b', text: '' },
    { id: 'opt_c', text: '' },
    { id: 'opt_d', text: '' },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState('opt_a');
  const [explanation, setExplanation] = useState('');

  const [courseNotFound, setCourseNotFound] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadQuestionBanks = async () => {
    if (!courseId) return;
    try {
      setIsLoading(true);
      setCourseNotFound(false);
      const banks = await assessmentService.getQuestionBanks(courseId);
      setQuestionBanks(banks);

      if (banks.length > 0) {
        const selected = banks[0];
        setActiveBank(selected);
        setBankTitle(selected.title);
        setBankPassPercentage(selected.pass_percentage);
        setBankTimeLimit(selected.time_limit_minutes);
        await loadQuestions(selected.id);
      } else {
        setActiveBank(null);
        setQuestions([]);
      }
    } catch (err: any) {
      console.error('Failed to load question banks:', err);
      if (err.response?.status === 404) {
        setCourseNotFound(true);
      }
      showToast(err.response?.data?.message || 'Failed to load assessment data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async (bankId: string) => {
    try {
      const data = await assessmentService.getQuestions(bankId);
      setQuestions(data.questions || []);
    } catch (err: any) {
      console.error('Failed to load questions:', err);
    }
  };

  useEffect(() => {
    loadQuestionBanks();
  }, [courseId]);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !bankTitle.trim()) return;

    try {
      setIsSavingBank(true);
      const newBank = await assessmentService.createQuestionBank({
        courseId,
        title: bankTitle.trim(),
        passPercentage: Number(bankPassPercentage),
        timeLimitMinutes: Number(bankTimeLimit),
      });

      showToast('Assessment Question Bank initialized successfully!');
      setIsEditBankModalOpen(false);
      await loadQuestionBanks();
    } catch (err: any) {
      console.error('Failed to create question bank:', err);
      showToast(err.response?.data?.message || 'Failed to create question bank', 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleCreateBankForAi = async () => {
    if (!courseId) return;

    try {
      setIsSavingBank(true);
      const newBank = await assessmentService.createQuestionBank({
        courseId,
        title: `AI Generated Assessment - ${new Date().toISOString().slice(0, 10)}`,
        passPercentage: 60,
        timeLimitMinutes: 30,
      });
      setQuestionBanks([newBank]);
      setActiveBank(newBank);
      setQuestions([]);
      setBankTitle(newBank.title);
      setBankPassPercentage(newBank.pass_percentage);
      setBankTimeLimit(newBank.time_limit_minutes);
      setIsAiModalOpen(true);
    } catch (err: any) {
      console.error('Failed to initialize AI question bank:', err);
      showToast(err.response?.data?.message || 'Failed to initialize question bank', 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBank) return;

    try {
      setIsSavingBank(true);
      const updated = await assessmentService.updateQuestionBank(activeBank.id, {
        title: bankTitle.trim(),
        passPercentage: Number(bankPassPercentage),
        timeLimitMinutes: Number(bankTimeLimit),
      });

      setActiveBank(updated);
      showToast('Assessment configuration updated.');
      setIsEditBankModalOpen(false);
      await loadQuestionBanks();
    } catch (err: any) {
      console.error('Failed to update question bank:', err);
      showToast(err.response?.data?.message || 'Failed to update settings', 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, text } : opt)),
    );
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBank) return;

    if (!questionText.trim()) {
      showToast('Please provide a question statement', 'error');
      return;
    }

    const unfilledOptions = options.some((opt) => !opt.text.trim());
    if (unfilledOptions) {
      showToast('Please fill in text for all 4 multiple choice options', 'error');
      return;
    }

    try {
      setIsSavingQuestion(true);
      const dto: CreateQuestionDto = {
        text: questionText.trim(),
        options: options.map((opt) => ({ id: opt.id, text: opt.text.trim() })),
        correctOptionId,
        explanation: explanation.trim() || undefined,
      };

      await assessmentService.addQuestion(activeBank.id, dto);
      showToast('New question added to assessment bank!');

      // Reset form
      setQuestionText('');
      setOptions([
        { id: 'opt_a', text: '' },
        { id: 'opt_b', text: '' },
        { id: 'opt_c', text: '' },
        { id: 'opt_d', text: '' },
      ]);
      setCorrectOptionId('opt_a');
      setExplanation('');
      setIsAddQuestionModalOpen(false);

      await loadQuestions(activeBank.id);
    } catch (err: any) {
      console.error('Failed to add question:', err);
      showToast(err.response?.data?.message || 'Failed to add question', 'error');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to remove this question?')) return;

    try {
      await assessmentService.deleteQuestion(questionId);
      showToast('Question removed successfully.');
      if (activeBank) {
        await loadQuestions(activeBank.id);
      }
    } catch (err: any) {
      console.error('Failed to delete question:', err);
      showToast(err.response?.data?.message || 'Failed to delete question', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        Loading Assessment Builder...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <Link
        to="/trainer/courses"
        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium ${
            toastType === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="MCQ Assessment Engine & Question Bank"
        description="Configure auto-graded timed assessments, passing standards, multiple choice options, and detailed answer explanations."
        action={
          activeBank ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsEditBankModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Assessment Settings
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-2 border-indigo-500/40 text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/40 shadow-sm"
              >
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Generate Quiz from PDF (AI)
              </Button>
              <Button
                onClick={() => setIsAddQuestionModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Course Not Found Warning */}
      {courseNotFound ? (
        <Card className="text-center py-16 space-y-4 border-amber-500/30 bg-amber-950/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Course Not Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              The course ID (<code>{courseId}</code>) was not found or does not belong to your trainer account. Please select one of your authored courses from the dashboard.
            </p>
          </div>
          <Link to="/trainer/courses" className="inline-block">
            <Button>
              <ChevronLeft className="h-4 w-4 mr-1" />
              View My Courses
            </Button>
          </Link>
        </Card>
      ) : !activeBank ? (
        <Card className="text-center py-16 space-y-4 border-dashed border-slate-700">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <HelpCircle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Assessment Configured</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Create a Question Bank for this course to allow trainees to test their knowledge, auto-calculate scores, and earn verifiable certificates.
            </p>
          </div>
          <Button onClick={() => setIsEditBankModalOpen(true)} className="px-6">
            <Plus className="h-4 w-4 mr-2" />
            Initialize Assessment Bank
          </Button>
          <Button
            onClick={handleCreateBankForAi}
            disabled={isSavingBank}
            variant="secondary"
            className="px-6 border-indigo-500/40 text-indigo-300"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isSavingBank ? 'Preparing...' : 'Create Quiz with AI'}
          </Button>
        </Card>
      ) : (
        <>
          {/* Bank Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex items-center gap-4 bg-slate-900/60">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Questions</p>
                <p className="text-xl font-black text-white">{questions.length}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-4 bg-slate-900/60">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Passing Threshold</p>
                <p className="text-xl font-black text-white">{activeBank.pass_percentage}%</p>
              </div>
            </Card>

            <Card className="flex items-center gap-4 bg-slate-900/60">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Time Limit</p>
                <p className="text-xl font-black text-white">{activeBank.time_limit_minutes} Mins</p>
              </div>
            </Card>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Authored Questions ({questions.length})
              </h3>
              {questions.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setIsAddQuestionModalOpen(true)}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Question
                </Button>
              )}
            </div>

            {questions.length === 0 ? (
              <Card className="text-center py-12 border-dashed border-slate-700">
                <p className="text-sm text-slate-300 font-semibold">No questions added yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click the button below to add your first multiple choice question with explanation.
                </p>
                <Button
                  onClick={() => setIsAddQuestionModalOpen(true)}
                  className="mt-4 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add First Question
                </Button>
              </Card>
            ) : (
              questions.map((q, idx) => (
                <Card key={q.id} className="space-y-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 text-xs font-bold font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        Single Choice (Auto-Graded)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm text-white font-medium leading-relaxed">
                    {q.text}
                  </p>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = opt.id === q.correct_option_id;
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-xs ${
                                isCorrect ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              {letter}.
                            </span>
                            <span>{opt.text}</span>
                          </span>
                          {isCorrect && (
                            <Badge variant="success" className="text-[10px] py-0.5 px-2 shrink-0">
                              Correct Key
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Banner */}
                  {q.explanation && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300">
                      <span className="font-semibold text-brand-300">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal: Assessment Settings / Create Bank */}
      {isEditBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {activeBank ? 'Assessment Settings' : 'Initialize Assessment Bank'}
              </h3>
              <button
                onClick={() => setIsEditBankModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={activeBank ? handleUpdateBank : handleCreateBank} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  value={bankTitle}
                  onChange={(e) => setBankTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Dynamics MCQ Quiz"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Passing Grade (%) *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    A certificate is issued only when a trainee meets this score.
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bankPassPercentage}
                    onChange={(e) => setBankPassPercentage(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Time Limit (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={bankTimeLimit}
                    onChange={(e) => setBankTimeLimit(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditBankModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingBank}>
                  {isSavingBank ? 'Saving...' : activeBank ? 'Save Changes' : 'Create Bank'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add MCQ Question */}
      {isAddQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Add New MCQ Question</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Specify 4 choices and select the correct answer key.
                </p>
              </div>
              <button
                onClick={() => setIsAddQuestionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-5">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Statement *
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. Which balance describes steady flow when Coriolis force equals horizontal pressure gradient?"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Multiple Choice Options & Correct Key *
                </label>

                {options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isChecked = correctOptionId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                        isChecked
                          ? 'border-emerald-500/50 bg-emerald-950/20'
                          : 'border-slate-800 bg-slate-950'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="radio"
                          name="correctOption"
                          value={opt.id}
                          checked={isChecked}
                          onChange={() => setCorrectOptionId(opt.id)}
                          className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 bg-slate-900 border-slate-700"
                        />
                        <span
                          className={`font-mono font-bold text-xs ${
                            isChecked ? 'text-emerald-400 font-bold' : 'text-slate-400'
                          }`}
                        >
                          Option {letter}:
                        </span>
                      </label>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                        placeholder={`Option ${letter} text`}
                        required
                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Answer Explanation (Shown to trainees after submission)
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why this option is correct to assist learning..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddQuestionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingQuestion}>
                  {isSavingQuestion ? 'Saving Question...' : 'Add Question to Bank'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Quiz Generator Modal */}
      {activeBank && (
        <AIQuizGeneratorModal
          questionBankId={activeBank.id}
          courseId={courseId}
          courseTitle={activeBank.title}
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onQuestionsSaved={async () => {
            showToast('AI quiz successfully generated from PDF and published to live bank!');
            if (activeBank) {
              await loadQuestions(activeBank.id);
            }
          }}
        />
      )}
    </div>
  );
};
