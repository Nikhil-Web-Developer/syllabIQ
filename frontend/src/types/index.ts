export type UserRole = 'trainee' | 'trainer' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type ResourceType = 'video' | 'pdf' | 'ppt' | 'doc' | 'link';
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillSource = 'self_declared' | 'certified' | 'assessed';
export type AnnouncementType = 'announcement' | 'achievement' | 'new_content';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface TraineeProfile {
  id: string;
  userId: string;
  bio?: string;
  qualifications?: any[];
  workExperience?: any[];
  interests?: string[];
}

export interface TrainerProfile {
  id: string;
  userId: string;
  bio?: string;
  yearsExperience?: number;
  qualifications?: any[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface UserSkill {
  id: string;
  skillId: string;
  name: string;
  category: string;
  proficiencyLevel: ProficiencyLevel;
  source: SkillSource;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  trainerId: string;
  trainerName: string;
  trainerEmail?: string;
  subjectSkillId?: string;
  skillName?: string;
  skillCategory?: string;
  difficulty: CourseDifficulty;
  status: CourseStatus;
  avgRating?: number;
  enrollmentCount?: number;
  createdAt: string;
}

export interface CourseResource {
  id: string;
  courseId: string;
  type: ResourceType;
  title: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface QuestionBank {
  id: string;
  courseId: string;
  title: string;
  deadline?: string;
  passPercentage: number;
  timeLimitMinutes: number;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  correctOptionId?: string;
  explanation?: string;
}

export interface AssessmentAttempt {
  id: string;
  questionBankId: string;
  traineeId: string;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  passed?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  publishedAt: string;
  authorName?: string;
}

export interface Certificate {
  id: string;
  userId: string;
  title: string;
  issuingBody: string;
  issueDate: string;
  fileUrl?: string;
  courseId?: string;
  verificationCode?: string;
  verification_code?: string;
  signedUrl?: string;
  signed_url?: string;
}

export interface BadgeItem {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  criteria: string;
  category: string;
  awarded_at?: string;
  metadata?: any;
}

export interface CertificateVerification {
  valid: boolean;
  verification_code: string;
  title: string;
  trainee_name: string;
  issuing_body: string;
  issue_date: string;
  course_title: string;
  verification_url: string;
  verified_at: string;
}

export interface AiCandidateQuestion {
  tempId: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  suggestedDifficulty: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetId?: string;
  metadata?: any;
  createdAt: string;
}

export interface ScoreBreakdown {
  proficiencyLevelWeight: number;
  proficiencyWeighted: number;
  yearsExperienceNormalized: number;
  yearsExperienceWeighted: number;
  avgRatingNormalized: number;
  avgRatingWeighted: number;
  priorCoursesNormalized: number;
  priorCoursesWeighted: number;
}

export interface RankedTrainerMatch {
  trainerId: string;
  trainerName: string;
  trainerEmail: string;
  bio?: string | null;
  yearsExperience: number;
  proficiencyLevel: ProficiencyLevel | string;
  skillSource?: string;
  priorCoursesCount: number;
  avgRating: number;
  ratingCount?: number;
  score: number;
  scorePercentage: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface CompetencyMatchResult {
  skill?: {
    id: string;
    name: string;
    category: string;
  } | null;
  course?: {
    id: string;
    title: string;
    trainerId?: string;
    trainerName?: string;
  } | null;
  trainers: RankedTrainerMatch[];
  totalMatches: number;
  message?: string;
}

export interface DashboardEnrollmentsData {
  total_enrollments: number;
  breakdown: {
    active: number;
    completed: number;
    dropped: number;
    avg_progress_percent: number;
  };
  enrollments_over_time: Array<{ bucket: string; count: number }>;
  enrollments_by_course: Array<{ course_id: string; course_title: string; enrollment_count: number; completed_count: number }>;
}

export interface DashboardCertificationsData {
  total_certificates: number;
  unique_trainees_certified: number;
  certified_courses_count: number;
  issuance_over_time: Array<{ bucket: string; count: number }>;
  top_courses: Array<{ course_id: string; course_title: string; count: number }>;
}

export interface DashboardAssessmentsData {
  overall_pass_rate: number;
  total_attempts: number;
  passed_attempts: number;
  failed_attempts: number;
  avg_score: number;
  by_course: Array<{
    course_id: string;
    course_title: string;
    question_bank_id: string;
    question_bank_title: string;
    attempt_count: number;
    passed_count: number;
    failed_count: number;
    avg_score: number;
    pass_rate: number;
  }>;
  by_subject_skill: Array<{
    skill_id: string;
    skill_name: string;
    skill_category: string;
    attempt_count: number;
    avg_score: number;
    pass_rate: number;
  }>;
}

export interface DashboardParticipationData {
  total_users: number;
  active_user_count: number;
  trainee_count: number;
  trainer_count: number;
  admin_count: number;
  pending_approval_count: number;
  approved_count: number;
  most_active_courses: Array<{
    course_id: string;
    course_title: string;
    trainer_name: string;
    skill_name: string;
    total_enrollments: number;
    total_completions: number;
    activity_score: number;
  }>;
  skill_gap_heatmap: Array<{
    category: string;
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
    total_tagged: number;
  }>;
}


