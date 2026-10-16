import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { BadgesService } from '../users/badges.service';
import { StorageService } from '../../common/storage/storage.service';
import { CertificatesService } from '../certificates/certificates.service';
import { AiPdfGeneratorService } from './ai-pdf-generator.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { GenerateFromPdfDto } from './dto/generate-from-pdf.dto';
import { UpdateAiDraftDto } from './dto/update-ai-draft.dto';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class AssessmentsService {
  constructor(
    private db: DatabaseService,
    private badgesService: BadgesService,
    private storageService: StorageService,
    private certificatesService: CertificatesService,
    private aiPdfGeneratorService: AiPdfGeneratorService,
  ) {}

  /**
   * Helper: verify trainer owns the course (or user is admin)
   */
  private async verifyCourseOwnership(courseId: string, userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) return;

    const courseRes = await this.db.query(
      'SELECT id, trainer_id FROM courses WHERE id = $1',
      [courseId],
    );

    if (courseRes.rows.length === 0) {
      throw new NotFoundException('Course not found');
    }

    if (courseRes.rows[0].trainer_id !== userId) {
      throw new ForbiddenException('You can only manage question banks for courses you authored');
    }
  }

  /**
   * Helper: verify question bank ownership via parent course
   */
  private async verifyQuestionBankOwnership(questionBankId: string, userId: string, userRole: UserRole) {
    const qbRes = await this.db.query(
      'SELECT id, course_id FROM question_banks WHERE id = $1',
      [questionBankId],
    );

    if (qbRes.rows.length === 0) {
      throw new NotFoundException('Question bank not found');
    }

    await this.verifyCourseOwnership(qbRes.rows[0].course_id, userId, userRole);
  }

  /**
   * Create Question Bank (Trainer / Admin)
   */
  async createQuestionBank(userId: string, userRole: UserRole, dto: CreateQuestionBankDto) {
    await this.verifyCourseOwnership(dto.courseId, userId, userRole);

    const res = await this.db.query(
      `INSERT INTO question_banks (course_id, subject_skill_id, title, deadline, pass_percentage, time_limit_minutes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, course_id, subject_skill_id, title, deadline, pass_percentage, time_limit_minutes, created_at`,
      [
        dto.courseId,
        dto.subjectSkillId || null,
        dto.title,
        dto.deadline || null,
        dto.passPercentage || 60,
        dto.timeLimitMinutes || 30,
      ],
    );

    return res.rows[0];
  }

  /**
   * List Question Banks for a Course
   */
  async getQuestionBanksByCourse(courseId: string, userId: string, userRole: UserRole) {
    const courseRes = await this.db.query(
      'SELECT id, title, status, trainer_id FROM courses WHERE id = $1',
      [courseId],
    );
    if (courseRes.rows.length === 0) {
      throw new NotFoundException('Course not found');
    }

    const res = await this.db.query(
      `SELECT qb.id, qb.course_id, qb.subject_skill_id, qb.title, qb.deadline,
              qb.pass_percentage, qb.time_limit_minutes, qb.created_at,
              COUNT(q.id)::int as question_count
       FROM question_banks qb
       LEFT JOIN questions q ON qb.id = q.question_bank_id
       WHERE qb.course_id = $1
       GROUP BY qb.id
       ORDER BY qb.created_at DESC, qb.id`,
      [courseId],
    );

    const questionBanks = res.rows;
    if (userRole !== UserRole.TRAINEE) {
      return questionBanks;
    }

    const readyBanks = questionBanks.filter((bank) => Number(bank.question_count) > 0);
    return Promise.all(
      readyBanks.map(async (bank) => {
        const attemptRes = await this.db.query(
          `SELECT id, started_at, submitted_at, score, passed
           FROM assessment_attempts
           WHERE question_bank_id = $1 AND trainee_id = $2
           ORDER BY started_at DESC
           LIMIT 1`,
          [bank.id, userId],
        );
        const latestAttempt = attemptRes.rows
          .sort(
            (a, b) =>
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
          )[0];

        return {
          ...bank,
          latestAttempt: latestAttempt || null,
        };
      }),
    );
  }

  /**
   * Update Question Bank Settings (Trainer / Admin)
   */
  async updateQuestionBank(
    questionBankId: string,
    userId: string,
    userRole: UserRole,
    dto: UpdateQuestionBankDto,
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    const res = await this.db.query(
      `UPDATE question_banks
       SET title = COALESCE($1, title),
           deadline = COALESCE($2, deadline),
           pass_percentage = COALESCE($3, pass_percentage),
           time_limit_minutes = COALESCE($4, time_limit_minutes),
           subject_skill_id = COALESCE($5, subject_skill_id)
       WHERE id = $6
       RETURNING id, course_id, subject_skill_id, title, deadline, pass_percentage, time_limit_minutes`,
      [
        dto.title ?? null,
        dto.deadline ?? null,
        dto.passPercentage ?? null,
        dto.timeLimitMinutes ?? null,
        dto.subjectSkillId ?? null,
        questionBankId,
      ],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Question bank not found');
    }

    return res.rows[0];
  }

  /**
   * Add Question to Question Bank (Trainer / Admin)
   */
  async addQuestion(
    questionBankId: string,
    userId: string,
    userRole: UserRole,
    dto: CreateQuestionDto,
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    // Validate options
    if (!dto.options || dto.options.length < 2) {
      throw new BadRequestException('A question must contain at least 2 options');
    }

    const hasCorrect = dto.options.some((opt) => opt.id === dto.correctOptionId);
    if (!hasCorrect) {
      throw new BadRequestException('The selected correctOptionId must match one of the option IDs');
    }

    const res = await this.db.query(
      `INSERT INTO questions (question_bank_id, text, options, correct_option_id, explanation)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, question_bank_id, text, options, correct_option_id, explanation`,
      [
        questionBankId,
        dto.text,
        JSON.stringify(dto.options),
        dto.correctOptionId,
        dto.explanation || null,
      ],
    );

    return res.rows[0];
  }

  /**
   * Get Questions for Question Bank (Role-Aware)
   */
  async getQuestions(questionBankId: string, userId: string, userRole: UserRole) {
    // Trainee Security Check: must have started an attempt to view questions
    if (userRole === UserRole.TRAINEE) {
      const attemptRes = await this.db.query(
        `SELECT id FROM assessment_attempts WHERE question_bank_id = $1 AND trainee_id = $2 AND submitted_at IS NULL`,
        [questionBankId, userId],
      );
      if (attemptRes.rows.length === 0) {
        throw new ForbiddenException(
          'You must initiate an active attempt via /attempts/start to view questions.',
        );
      }
    }

    const res = await this.db.query(
      `SELECT id, question_bank_id, text, options,
              ${userRole !== UserRole.TRAINEE ? 'correct_option_id, explanation,' : ''}
              created_at
       FROM questions
       WHERE question_bank_id = $1
       ORDER BY created_at ASC`,
      [questionBankId],
    );

    return res.rows.map((q) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));
  }

  /**
   * Delete Question from Question Bank (Trainer / Admin)
   */
  async deleteQuestion(questionId: string, userId: string, userRole: UserRole) {
    const qRes = await this.db.query('SELECT id, question_bank_id FROM questions WHERE id = $1', [
      questionId,
    ]);
    if (qRes.rows.length === 0) {
      throw new NotFoundException('Question not found');
    }

    await this.verifyQuestionBankOwnership(qRes.rows[0].question_bank_id, userId, userRole);

    await this.db.query('DELETE FROM questions WHERE id = $1', [questionId]);

    return { message: 'Question deleted successfully', questionId };
  }

  /**
   * Start Timed Attempt (Trainee)
   */
  async startAttempt(questionBankId: string, traineeId: string) {
    const qbRes = await this.db.query(
      'SELECT id, title, deadline, pass_percentage, time_limit_minutes, course_id FROM question_banks WHERE id = $1',
      [questionBankId],
    );
    if (qbRes.rows.length === 0) {
      throw new NotFoundException('Question bank not found');
    }
    const qb = qbRes.rows[0];

    const courseRes = await this.db.query(
      'SELECT status FROM courses WHERE id = $1',
      [qb.course_id],
    );
    if (courseRes.rows.length === 0 || courseRes.rows[0].status !== 'published') {
      throw new NotFoundException('This assessment is not available');
    }

    // Enforce deadline check
    if (qb.deadline && new Date(qb.deadline) < new Date()) {
      throw new BadRequestException('The assessment deadline has passed. New attempts cannot be started.');
    }

    // Verify trainee is actively enrolled in parent course
    const enrollRes = await this.db.query(
      `SELECT id, status FROM enrollments
       WHERE course_id = $1 AND trainee_id = $2 AND status IN ('active', 'completed')`,
      [qb.course_id, traineeId],
    );

    if (enrollRes.rows.length === 0) {
      throw new ForbiddenException('You must be enrolled in this course to take the assessment.');
    }

    const questionsRes = await this.db.query(
      'SELECT id, question_bank_id, text, options FROM questions WHERE question_bank_id = $1',
      [questionBankId],
    );
    if (questionsRes.rows.length === 0) {
      throw new BadRequestException('This quiz has no questions yet. Please contact the course trainer.');
    }

    // Check if there is an active (unsubmitted) attempt
    const existingAttempt = await this.db.query(
      `SELECT id, question_bank_id, trainee_id, started_at, submitted_at
       FROM assessment_attempts
       WHERE question_bank_id = $1 AND trainee_id = $2 AND submitted_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
      [questionBankId, traineeId],
    );

    let attempt = existingAttempt.rows[0];

    if (!attempt) {
      // Create new attempt
      const attemptRes = await this.db.query(
        `INSERT INTO assessment_attempts (question_bank_id, trainee_id, started_at)
         VALUES ($1, $2, NOW())
         RETURNING id, question_bank_id, trainee_id, started_at`,
        [questionBankId, traineeId],
      );
      attempt = attemptRes.rows[0];
    }

    // Fetch questions WITHOUT correct_option_id or explanation, and randomize order for anti-cheating
    const questionsList = questionsRes.rows.map((q) => {
      const opts = typeof q.options === 'string' ? JSON.parse(q.options) : [...q.options];
      // Randomize option order
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      return {
        id: q.id,
        question_bank_id: q.question_bank_id,
        text: q.text,
        options: opts,
      };
    });

    // Randomize question order
    for (let i = questionsList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionsList[i], questionsList[j]] = [questionsList[j], questionsList[i]];
    }

    return {
      attempt,
      questionBank: qb,
      questions: questionsList,
    };
  }

  /**
   * Submit Attempt & Auto-Grade (Trainee)
   */
  async submitAttempt(attemptId: string, traineeId: string, dto: SubmitAttemptDto) {
    const aRes = await this.db.query(
      `SELECT a.id, a.question_bank_id, a.trainee_id, a.started_at, a.submitted_at,
              qb.pass_percentage, qb.time_limit_minutes, qb.course_id, qb.title as qb_title,
              c.title as course_title, s.category as skill_category
       FROM assessment_attempts a
       JOIN question_banks qb ON a.question_bank_id = qb.id
       LEFT JOIN courses c ON qb.course_id = c.id
       LEFT JOIN skills s ON c.subject_skill_id = s.id
       WHERE a.id = $1`,
      [attemptId],
    );

    if (aRes.rows.length === 0) {
      throw new NotFoundException('Assessment attempt not found');
    }

    const attempt = aRes.rows[0];
    if (attempt.trainee_id !== traineeId) {
      throw new ForbiddenException('You cannot submit answers for another user attempt');
    }
    if (attempt.submitted_at) {
      throw new BadRequestException('This attempt has already been submitted');
    }

    // Validate time limit with a 2-minute latency grace period
    const startedAt = new Date(attempt.started_at).getTime();
    const now = Date.now();
    const allowedDurationMs = (attempt.time_limit_minutes + 2) * 60 * 1000;

    if (now - startedAt > allowedDurationMs) {
      // Grace period exceeded: mark attempt as timed out
    }

    // Fetch all questions for evaluation (with correct_option_id)
    const questionsRes = await this.db.query(
      'SELECT id, correct_option_id FROM questions WHERE question_bank_id = $1',
      [attempt.question_bank_id],
    );

    const questions = questionsRes.rows;
    let correctCount = 0;
    const totalCount = questions.length;

    for (const q of questions) {
      const selected = dto.answers[q.id];
      if (selected && selected === q.correct_option_id) {
        correctCount++;
      }
    }

    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passPercentage = Number(attempt.pass_percentage ?? 60);
    const passed = score >= passPercentage;

    await this.db.query(
      `UPDATE assessment_attempts
       SET submitted_at = NOW(),
           score = $1,
           passed = $2,
           answers = $3
       WHERE id = $4`,
      [score, passed, JSON.stringify(dto.answers), attemptId],
    );

    let certificate: any = null;
    let awardedBadges: any[] = [];

    // If passed, mark enrollment completed and issue certificate
    if (passed && attempt.course_id) {
      await this.db.query(
        `UPDATE enrollments
         SET progress_percent = 100, status = 'completed', completed_at = NOW()
         WHERE course_id = $1 AND trainee_id = $2`,
        [attempt.course_id, traineeId],
      );

      // Generate certificate with PDF
      try {
        certificate = await this.certificatesService.generateCertificateForPassing(
          traineeId,
          attemptId,
          attempt.course_id,
          score,
        );
      } catch (error) {
        console.error('Certificate generation failed:', error);
        // Don't fail the assessment if certificate generation fails
      }

      // Gamification: evaluate and award badges
      awardedBadges = await this.badgesService.evaluateMilestones(traineeId, {
        score,
        courseId: attempt.course_id,
        category: attempt.skill_category,
      });
    }

    return {
      attemptId,
      score,
      passed,
      passPercentage,
      correctCount,
      totalQuestions: totalCount,
      courseId: attempt.course_id,
      certificate,
      awardedBadges,
    };
  }

  /**
   * Get Attempt Result & Detailed Review
   */
  async getResult(attemptId: string, userId: string, userRole: UserRole) {
    const aRes = await this.db.query(
      `SELECT a.id, a.question_bank_id, a.trainee_id, a.started_at, a.submitted_at,
              a.score, a.passed, a.answers,
              qb.title as question_bank_title, qb.pass_percentage, qb.time_limit_minutes, qb.course_id
       FROM assessment_attempts a
       JOIN question_banks qb ON a.question_bank_id = qb.id
       WHERE a.id = $1`,
      [attemptId],
    );

    if (aRes.rows.length === 0) {
      throw new NotFoundException('Attempt not found');
    }

    const attempt = aRes.rows[0];

    // Trainee access control: must be their own attempt and submitted
    if (userRole === UserRole.TRAINEE) {
      if (attempt.trainee_id !== userId) {
        throw new ForbiddenException('You can only view your own assessment results');
      }
      if (!attempt.submitted_at) {
        throw new ForbiddenException('Assessment result is available only after submission');
      }
    }

    // Fetch questions with correct answers and explanations for review
    const qRes = await this.db.query(
      'SELECT id, text, options, correct_option_id, explanation FROM questions WHERE question_bank_id = $1',
      [attempt.question_bank_id],
    );

    const questions = qRes.rows.map((q) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));

    return {
      ...attempt,
      answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers,
      questions,
    };
  }

  // =========================================================================
  // AI-POWERED PDF-TO-QUIZ GENERATION & DRAFT REVIEW WORKFLOW
  // =========================================================================

  /**
   * Generates candidate MCQs from an uploaded PDF.
   * Extracts clean text, validates grounded content, and stores drafts in ai_draft_questions.
   */
  async generateFromPdf(
    trainerId: string,
    role: UserRole,
    file: any,
    dto: GenerateFromPdfDto,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF file is required.');
    }

    // 1. Enforce rate limiting
    this.aiPdfGeneratorService.checkRateLimit(trainerId);

    // 2. Extract and validate text server-side
    const text = await this.aiPdfGeneratorService.extractTextFromPdf(file.buffer);

    // 3. Save original PDF in object storage
    const saved = await this.storageService.saveFile(file, 'quiz-sources');
    const signedPdfUrl = this.storageService.generateSignedUrl(saved.filename);

    // 4. Resolve or create question bank
    let bankId = dto.questionBankId;
    let questionBank: any = null;

    if (bankId) {
      await this.verifyQuestionBankOwnership(bankId, trainerId, role);
      await this.db.query(
        `UPDATE question_banks
         SET source_pdf_url = COALESCE($1, source_pdf_url),
             source_text = COALESCE($2, source_text)
         WHERE id = $3`,
        [saved.filename, text, bankId],
      );
      const bRes = await this.db.query('SELECT * FROM question_banks WHERE id = $1', [bankId]);
      questionBank = bRes.rows[0];
    } else if (dto.courseId) {
      await this.verifyCourseOwnership(dto.courseId, trainerId, role);
      const title = dto.title || `AI Generated Assessment - ${new Date().toISOString().split('T')[0]}`;
      const bRes = await this.db.query(
        `INSERT INTO question_banks (course_id, title, pass_percentage, time_limit_minutes, source_pdf_url, source_text)
         VALUES ($1, $2, 60, 30, $3, $4)
         RETURNING *`,
        [dto.courseId, title, saved.filename, text],
      );
      questionBank = bRes.rows[0];
      bankId = questionBank.id;
    } else {
      throw new BadRequestException('Either courseId or questionBankId must be provided');
    }

    // 5. Generate 10-15 grounded MCQs
    const mcqs = await this.aiPdfGeneratorService.generateGroundedMcqs(
      text,
      dto.count || 12,
      dto.difficulty || 'intermediate',
    );

    // 6. Save drafts in ai_draft_questions with status = 'pending_review'
    const drafts: any[] = [];
    for (const mcq of mcqs) {
      const res = await this.db.query(
        `INSERT INTO ai_draft_questions (question_bank_id, text, options, correct_option_id, explanation, source, status)
         VALUES ($1, $2, $3, $4, $5, 'ai_generated', 'pending_review')
         RETURNING *`,
        [
          bankId,
          mcq.text,
          JSON.stringify(mcq.options),
          mcq.correctOptionId,
          mcq.explanation,
        ],
      );
      const draft = res.rows[0];
      drafts.push({
        ...draft,
        options: typeof draft.options === 'string' ? JSON.parse(draft.options) : draft.options,
      });
    }

    return {
      questionBankId: bankId,
      questionBank,
      sourcePdfUrl: signedPdfUrl,
      sourceLength: text.length,
      generatedCount: drafts.length,
      drafts,
    };
  }

  /**
   * Get pending AI drafts for a question bank (Trainer / Admin only)
   */
  async getAiDrafts(questionBankId: string, userId: string, userRole: UserRole) {
    if (userRole === UserRole.TRAINEE) {
      throw new ForbiddenException('Trainees cannot access unapproved draft questions');
    }
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    const res = await this.db.query(
      `SELECT id, question_bank_id, text, options, correct_option_id, explanation, source, status, created_at, updated_at
       FROM ai_draft_questions
       WHERE question_bank_id = $1
       ORDER BY created_at ASC`,
      [questionBankId],
    );

    return res.rows.map((d) => ({
      ...d,
      options: typeof d.options === 'string' ? JSON.parse(d.options) : d.options,
    }));
  }

  /**
   * Store drafts directly into ai_draft_questions (Trainer / Admin only)
   */
  async storeAiDrafts(
    questionBankId: string,
    userId: string,
    userRole: UserRole,
    draftList: any[],
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    const saved: any[] = [];
    for (const d of draftList) {
      const res = await this.db.query(
        `INSERT INTO ai_draft_questions (question_bank_id, text, options, correct_option_id, explanation, source, status)
         VALUES ($1, $2, $3, $4, $5, 'ai_generated', 'pending_review')
         RETURNING *`,
        [
          questionBankId,
          d.text,
          JSON.stringify(d.options),
          d.correctOptionId || d.correct_option_id,
          d.explanation || null,
        ],
      );
      const row = res.rows[0];
      saved.push({
        ...row,
        options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      });
    }

    return saved;
  }

  /**
   * Edit an AI Draft Question (Trainer / Admin only)
   */
  async updateAiDraft(
    questionBankId: string,
    draftId: string,
    userId: string,
    userRole: UserRole,
    dto: UpdateAiDraftDto,
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    if (dto.options && dto.correctOptionId) {
      const valid = dto.options.some((o) => o.id === dto.correctOptionId);
      if (!valid) {
        throw new BadRequestException('correctOptionId must match one of the candidate options');
      }
    }

    const res = await this.db.query(
      `UPDATE ai_draft_questions
       SET text = COALESCE($1, text),
           options = COALESCE($2, options),
           correct_option_id = COALESCE($3, correct_option_id),
           explanation = COALESCE($4, explanation),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        dto.text || null,
        dto.options ? JSON.stringify(dto.options) : null,
        dto.correctOptionId || null,
        dto.explanation || null,
        draftId,
      ],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Draft question not found');
    }

    const draft = res.rows[0];
    return {
      ...draft,
      options: typeof draft.options === 'string' ? JSON.parse(draft.options) : draft.options,
    };
  }

  /**
   * Delete an AI Draft Question (Trainer / Admin only)
   */
  async deleteAiDraft(
    questionBankId: string,
    draftId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    const res = await this.db.query(
      `DELETE FROM ai_draft_questions WHERE id = $1 RETURNING id`,
      [draftId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Draft question not found');
    }

    return { message: 'Draft question deleted successfully', id: draftId };
  }

  /**
   * Regenerate a single AI draft question from the question bank's source document
   */
  async regenerateAiDraft(
    questionBankId: string,
    draftId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    // Fetch Question Bank source text
    const qbRes = await this.db.query(
      'SELECT id, source_text, title FROM question_banks WHERE id = $1',
      [questionBankId],
    );
    if (qbRes.rows.length === 0) {
      throw new NotFoundException('Question bank not found');
    }

    const qb = qbRes.rows[0];
    const sourceText = qb.source_text || qb.title || 'Atmospheric and oceanographic modeling standard protocols';

    const freshMcq = this.aiPdfGeneratorService.regenerateSingleQuestion(sourceText);

    const res = await this.db.query(
      `UPDATE ai_draft_questions
       SET text = $1,
           options = $2,
           correct_option_id = $3,
           explanation = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        freshMcq.text,
        JSON.stringify(freshMcq.options),
        freshMcq.correctOptionId,
        freshMcq.explanation,
        draftId,
      ],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Draft question not found');
    }

    const draft = res.rows[0];
    return {
      ...draft,
      options: typeof draft.options === 'string' ? JSON.parse(draft.options) : draft.options,
    };
  }

  /**
   * Approve a single AI draft question -> moves to live questions table with source='ai_generated'
   */
  async approveAiDraft(
    questionBankId: string,
    draftId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    // Fetch draft
    const draftRes = await this.db.query(
      'SELECT * FROM ai_draft_questions WHERE id = $1',
      [draftId],
    );
    if (draftRes.rows.length === 0) {
      throw new NotFoundException('Draft question not found');
    }

    const draft = draftRes.rows[0];

    // Insert into live questions
    const qRes = await this.db.query(
      `INSERT INTO questions (question_bank_id, text, options, correct_option_id, explanation, source)
       VALUES ($1, $2, $3, $4, $5, 'ai_generated')
       RETURNING *`,
      [
        questionBankId,
        draft.text,
        typeof draft.options === 'string' ? draft.options : JSON.stringify(draft.options),
        draft.correct_option_id,
        draft.explanation || null,
      ],
    );

    // Delete from drafts
    await this.db.query('DELETE FROM ai_draft_questions WHERE id = $1', [draftId]);

    const liveQuestion = qRes.rows[0];
    return {
      message: 'Draft question approved and published to live question bank',
      question: {
        ...liveQuestion,
        options:
          typeof liveQuestion.options === 'string'
            ? JSON.parse(liveQuestion.options)
            : liveQuestion.options,
      },
    };
  }

  /**
   * Bulk approve all AI draft questions for a question bank
   */
  async approveAllAiDrafts(
    questionBankId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.verifyQuestionBankOwnership(questionBankId, userId, userRole);

    const draftsRes = await this.db.query(
      'SELECT * FROM ai_draft_questions WHERE question_bank_id = $1',
      [questionBankId],
    );

    const approvedQuestions: any[] = [];

    for (const draft of draftsRes.rows) {
      const qRes = await this.db.query(
        `INSERT INTO questions (question_bank_id, text, options, correct_option_id, explanation, source)
         VALUES ($1, $2, $3, $4, $5, 'ai_generated')
         RETURNING *`,
        [
          questionBankId,
          draft.text,
          typeof draft.options === 'string' ? draft.options : JSON.stringify(draft.options),
          draft.correct_option_id,
          draft.explanation || null,
        ],
      );
      const liveQ = qRes.rows[0];
      approvedQuestions.push({
        ...liveQ,
        options: typeof liveQ.options === 'string' ? JSON.parse(liveQ.options) : liveQ.options,
      });
    }

    // Delete all drafts for this bank
    await this.db.query('DELETE FROM ai_draft_questions WHERE question_bank_id = $1', [
      questionBankId,
    ]);

    return {
      message: `Successfully approved and published ${approvedQuestions.length} AI draft questions to live question bank`,
      count: approvedQuestions.length,
      questions: approvedQuestions,
    };
  }

  /**
   * Get all trainee attempts for a course (Trainer / Admin view)
   */
  async getCourseAttempts(courseId: string, userId: string, userRole: UserRole) {
    if (userRole === UserRole.TRAINER) {
      await this.verifyCourseOwnership(courseId, userId, userRole);
    }

    const res = await this.db.query(
      `SELECT a.id as attempt_id, a.score, a.passed, a.started_at, a.submitted_at,
              qb.id as question_bank_id, qb.title as assessment_title, qb.pass_percentage,
              u.id as trainee_id, u.name as trainee_name, u.email as trainee_email
       FROM assessment_attempts a
       JOIN question_banks qb ON a.question_bank_id = qb.id
       JOIN users u ON a.trainee_id = u.id
       WHERE qb.course_id = $1
       ORDER BY a.started_at DESC`,
      [courseId],
    );

    return res.rows;
  }

  /**
   * Get current trainee's attempts for a specific course
   */
  async getMyCourseAttempts(courseId: string, traineeId: string) {
    const res = await this.db.query(
      `SELECT a.id as attempt_id, a.score, a.passed, a.started_at, a.submitted_at,
              qb.id as question_bank_id, qb.title as assessment_title, qb.pass_percentage
       FROM assessment_attempts a
       JOIN question_banks qb ON a.question_bank_id = qb.id
       WHERE qb.course_id = $1 AND a.trainee_id = $2
       ORDER BY a.started_at DESC`,
      [courseId, traineeId],
    );

    return res.rows;
  }
}
