import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import {
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  UploadCloud,
  FileUp,
  Trash2,
  BrainCircuit,
  Save,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { AiCandidateQuestion } from '../../types';

interface AIQuizGeneratorModalProps {
  questionBankId: string;
  courseId?: string;
  courseTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onQuestionsSaved: () => void;
}

export const AIQuizGeneratorModal: React.FC<AIQuizGeneratorModalProps> = ({
  questionBankId,
  courseId,
  courseTitle,
  isOpen,
  onClose,
  onQuestionsSaved,
}) => {
  const [tab, setTab] = useState<'pdf' | 'text'>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [candidates, setCandidates] = useState<AiCandidateQuestion[]>([]);
  const [pdfDraftIds, setPdfDraftIds] = useState<string[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF generation stores drafts server-side so trainer edits can be saved before approval.
  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Please select a PDF file first');
      }
      setErrorMessage(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('count', String(count));
      formData.append('difficulty', difficulty);
      if (questionBankId) {
        formData.append('questionBankId', questionBankId);
      }
      if (courseId) {
        formData.append('courseId', courseId);
      }

      const res = await api.post('/question-banks/generate-from-pdf', formData);
      return res.data;
    },
    onSuccess: (data) => {
      // Map returned drafts
      const drafts = (data.drafts || []).map((d: any, idx: number) => ({
        tempId: d.id || `draft-${idx}`,
        text: d.text,
        options: Array.isArray(d.options) ? d.options : [],
        correctOptionId: d.correct_option_id || d.correctOptionId || 'opt_1',
        explanation: d.explanation || '',
        suggestedDifficulty: difficulty,
      }));
      setCandidates(drafts);
      setPdfDraftIds(drafts.map((draft: AiCandidateQuestion) => draft.tempId));
      setStep('review');
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to generate questions from PDF with Gemini AI.',
      );
    },
  });

  // Generate from Text Mutation
  const generateTextMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const res = await api.post('/question-banks/ai-generate-questions', {
        content,
        count,
        difficulty,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setCandidates(data.candidateQuestions || []);
      setPdfDraftIds([]);
      setStep('review');
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to generate questions from text with AI.',
      );
    },
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Please select a valid PDF file (.pdf).');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Please drop a valid PDF file (.pdf).');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleUpdateCandidateText = (idx: number, newText: string) => {
    const updated = [...candidates];
    updated[idx].text = newText;
    setCandidates(updated);
  };

  const handleUpdateOptionText = (qIdx: number, optIdx: number, newText: string) => {
    const updated = [...candidates];
    updated[qIdx].options[optIdx].text = newText;
    setCandidates(updated);
  };

  const handleSetCorrectOption = (qIdx: number, optId: string) => {
    const updated = [...candidates];
    updated[qIdx].correctOptionId = optId;
    setCandidates(updated);
  };

  const handleRemoveCandidate = (idx: number) => {
    setCandidates(candidates.filter((_, i) => i !== idx));
  };

  const handlePublishAllToStudents = async () => {
    try {
      setIsPublishing(true);
      setErrorMessage(null);

      const invalidCandidate = candidates.find(
        (candidate) =>
          !candidate.text.trim() ||
          candidate.options.length !== 4 ||
          candidate.options.some((option) => !option.text.trim()) ||
          !candidate.options.some((option) => option.id === candidate.correctOptionId),
      );
      if (candidates.length === 0) {
        throw new Error('Generate at least one question before publishing.');
      }
      if (invalidCandidate) {
        throw new Error('Each question needs text, four completed options, and a correct answer.');
      }

      if (tab === 'pdf' && pdfDraftIds.length > 0) {
        const retainedIds = new Set(candidates.map((candidate) => candidate.tempId));
        for (const draftId of pdfDraftIds) {
          if (!retainedIds.has(draftId)) {
            await api.delete(`/question-banks/${questionBankId}/ai-drafts/${draftId}`);
          }
        }

        for (const candidate of candidates) {
          await api.patch(
            `/question-banks/${questionBankId}/ai-drafts/${candidate.tempId}`,
            {
              text: candidate.text,
              options: candidate.options,
              correctOptionId: candidate.correctOptionId,
              explanation: candidate.explanation,
            },
          );
        }

        await api.post(`/question-banks/${questionBankId}/ai-drafts/approve-all`);
      } else {
        for (const candidate of candidates) {
          await api.post(`/question-banks/${questionBankId}/questions`, {
            text: candidate.text,
            options: candidate.options,
            correctOptionId: candidate.correctOptionId,
            explanation: candidate.explanation,
          });
        }
      }

      onQuestionsSaved();
      setStep('input');
      setCandidates([]);
      setPdfDraftIds([]);
      setSelectedFile(null);
      setContent('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to publish questions to question bank.');
    } finally {
      setIsPublishing(false);
    }
  };

  const isGenerating = generatePdfMutation.isPending || generateTextMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">AI Quiz Generator</h3>
                <Badge variant="purple">PDF or Text</Badge>
              </div>
              <p className="text-xs text-slate-400">
                {courseTitle ? `Course: ${courseTitle}` : 'Instantly create auto-graded assessments from uploaded study materials'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTab('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                    tab === 'pdf'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileUp className="h-4 w-4" />
                  Upload PDF Lecture / Syllabus
                </button>
                <button
                  type="button"
                  onClick={() => setTab('text')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                    tab === 'text'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Paste Text / Notes
                </button>
              </div>

              {tab === 'pdf' ? (
                <div className="space-y-4">
                  {/* File Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                      selectedFile
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : 'border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-950/70'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="mt-2 text-xs"
                        >
                          Change PDF File
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <UploadCloud className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Click to browse or drag and drop your PDF here
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Lecture notes, scientific papers, curriculum modules, or PPT handouts (up to 15MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Source Notes / Lecture Excerpts
                  </label>
                  <textarea
                    rows={7}
                    placeholder="Paste lecture excerpts, syllabus points, scientific formulas, or atmospheric dynamic models here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-slate-950 text-xs text-white p-3.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  />
                </div>
              )}

              {/* Quiz Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Number of Questions to Generate
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full bg-slate-950 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={3}>3 Questions (Quick Quiz)</option>
                    <option value={5}>5 Questions (Standard Practice)</option>
                    <option value={8}>8 Questions (Module Test)</option>
                    <option value={10}>10 Questions (Comprehensive Assessment)</option>
                    <option value={12}>12 Questions (In-depth)</option>
                    <option value={15}>15 Questions (Final Exam)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-slate-950 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="beginner">Beginner (Definitions &amp; Foundational Concepts)</option>
                    <option value="intermediate">Intermediate (Applied Analysis &amp; Formulae)</option>
                    <option value="advanced">Advanced (Complex Scientific Synthesis)</option>
                  </select>
                </div>
              </div>

              {/* Informational Box */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Instant Student Availability
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Once generated, you can review and edit each question and answer before publishing. Once published, all enrolled students will immediately see the quiz under their course dashboard, can submit attempts, and scores are tracked in real-time.
                </p>
              </div>
            </div>
          ) : (
            /* Review & Edit Step */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Review &amp; Edit Candidate Questions ({candidates.length})
                  </h4>
                  <p className="text-xs text-slate-400">
                    Verify wording, options, and explanations. When satisfied, click "Publish Quiz to Enrolled Students".
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setStep('input')}>
                  Back to Upload
                </Button>
              </div>

              {candidates.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No candidate questions drafted. Click "Back to Upload" to try again.
                </div>
              ) : (
                <div className="space-y-4">
                  {candidates.map((cand, qIdx) => (
                    <Card
                      key={cand.tempId}
                      className="space-y-3 bg-slate-950/80 border-slate-800 hover:border-slate-700 transition-all p-4"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="purple">Question #{qIdx + 1}</Badge>
                        <button
                          onClick={() => handleRemoveCandidate(qIdx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors text-xs flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>

                      {/* Question Text */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Question Prompt:
                        </label>
                        <input
                          type="text"
                          value={cand.text}
                          onChange={(e) => handleUpdateCandidateText(qIdx, e.target.value)}
                          className="w-full bg-slate-900 text-xs text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* 4 Options */}
                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] font-semibold text-slate-400">
                          Options (Select the radio button for the correct option):
                        </label>
                        {cand.options.map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${cand.tempId}`}
                              checked={cand.correctOptionId === opt.id}
                              onChange={() => handleSetCorrectOption(qIdx, opt.id)}
                              className="accent-emerald-500 cursor-pointer h-4 w-4"
                            />
                            <span className="text-xs font-bold text-slate-400 w-5">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleUpdateOptionText(qIdx, optIdx, e.target.value)}
                              className={`w-full bg-slate-900 text-xs text-white px-3 py-1.5 rounded-xl border ${
                                cand.correctOptionId === opt.id
                                  ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200'
                                  : 'border-slate-800'
                              } focus:outline-none focus:border-indigo-500`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Explanation */}
                      <div className="pt-1">
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Explanation (shown to trainee post-submission):
                        </label>
                        <input
                          type="text"
                          value={cand.explanation}
                          onChange={(e) => {
                            const updated = [...candidates];
                            updated[qIdx].explanation = e.target.value;
                            setCandidates(updated);
                          }}
                          className="w-full bg-slate-900 text-xs text-slate-300 px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <Button variant="secondary" onClick={onClose} disabled={isGenerating || isPublishing}>
            Cancel
          </Button>

          {step === 'input' ? (
            <Button
              onClick={() => {
                if (tab === 'pdf') {
                  generatePdfMutation.mutate();
                } else {
                  generateTextMutation.mutate();
                }
              }}
              isLoading={isGenerating}
              disabled={tab === 'pdf' ? !selectedFile : content.trim().length < 15}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Analyzing your course material...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Generate Quiz with Gemini AI
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePublishAllToStudents}
              isLoading={isPublishing}
              disabled={candidates.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Publish Quiz to Enrolled Students ({candidates.length} Questions)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
