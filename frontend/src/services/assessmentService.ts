import api from './api';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  question_bank_id: string;
  text: string;
  options: QuestionOption[];
  correct_option_id?: string;
  explanation?: string;
}

export interface QuestionBank {
  id: string;
  course_id: string;
  subject_skill_id?: string | null;
  title: string;
  deadline?: string | null;
  pass_percentage: number;
  time_limit_minutes: number;
  question_count?: number;
  latestAttempt?: {
    id: string;
    started_at: string;
    submitted_at: string | null;
    score: number;
    passed: boolean;
  } | null;
}

export interface CreateQuestionBankDto {
  courseId: string;
  subjectSkillId?: string;
  title: string;
  deadline?: string;
  passPercentage?: number;
  timeLimitMinutes?: number;
}

export interface UpdateQuestionBankDto {
  title?: string;
  deadline?: string;
  passPercentage?: number;
  timeLimitMinutes?: number;
  subjectSkillId?: string;
}

export interface CreateQuestionDto {
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation?: string;
}

export interface AttemptResult {
  id: string;
  question_bank_id: string;
  trainee_id: string;
  started_at: string;
  submitted_at: string;
  score: number;
  passed: boolean;
  pass_percentage: number;
  time_limit_minutes: number;
  question_bank_title: string;
  course_id: string;
  answers: Record<string, string>;
  questions: Question[];
}

export const assessmentService = {
  // Question Banks
  getQuestionBanks: async (courseId: string): Promise<QuestionBank[]> => {
    const res = await api.get<QuestionBank[]>(`/courses/${courseId}/question-banks`);
    return res.data;
  },

  createQuestionBank: async (dto: CreateQuestionBankDto): Promise<QuestionBank> => {
    const res = await api.post<QuestionBank>('/question-banks', dto);
    return res.data;
  },

  updateQuestionBank: async (id: string, dto: UpdateQuestionBankDto): Promise<QuestionBank> => {
    const res = await api.patch<QuestionBank>(`/question-banks/${id}`, dto);
    return res.data;
  },

  // Questions
  getQuestions: async (
    questionBankId: string,
  ): Promise<{
    questionBank: QuestionBank;
    attempt?: any;
    questions: Question[];
  }> => {
    const res = await api.get(`/question-banks/${questionBankId}/questions`);
    return res.data;
  },

  addQuestion: async (questionBankId: string, dto: CreateQuestionDto): Promise<Question> => {
    const res = await api.post<Question>(`/question-banks/${questionBankId}/questions`, dto);
    return res.data;
  },

  deleteQuestion: async (questionId: string): Promise<{ message: string; questionId: string }> => {
    const res = await api.delete(`/questions/${questionId}`);
    return res.data;
  },

  // Trainee Attempts
  startAttempt: async (
    questionBankId: string,
  ): Promise<{
    attempt: { id: string; question_bank_id: string; trainee_id: string; started_at: string };
    questionBank: QuestionBank;
    questions: Question[];
  }> => {
    const res = await api.post('/attempts/start', { questionBankId });
    return res.data;
  },

  submitAttempt: async (
    attemptId: string,
    answers: Record<string, string>,
  ): Promise<{
    attemptId: string;
    score: number;
    passed: boolean;
    passPercentage: number;
    correctCount: number;
    totalQuestions: number;
    courseId: string;
  }> => {
    const res = await api.post(`/attempts/${attemptId}/submit`, { answers });
    return res.data;
  },

  getAttemptResult: async (attemptId: string): Promise<AttemptResult> => {
    const res = await api.get<AttemptResult>(`/attempts/${attemptId}/result`);
    return res.data;
  },

  // AI & PDF Generation
  generateFromPdf: async (formData: FormData): Promise<any> => {
    const res = await api.post('/question-banks/generate-from-pdf', formData);
    return res.data;
  },

  approveAllAiDrafts: async (questionBankId: string): Promise<any> => {
    const res = await api.post(`/question-banks/${questionBankId}/ai-drafts/approve-all`);
    return res.data;
  },

  // Course Attempts & Scores
  getCourseAttempts: async (courseId: string): Promise<any[]> => {
    const res = await api.get(`/courses/${courseId}/attempts`);
    return res.data;
  },

  getMyCourseAttempts: async (courseId: string): Promise<any[]> => {
    const res = await api.get(`/courses/${courseId}/my-attempts`);
    return res.data;
  },
};
