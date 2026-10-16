import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MongoClient, Db, Collection, Document } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  private isConnected = false;
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isMongoConnected = false;

  // In-Memory Fallback Store (for offline / unit-test mode when PostgreSQL is not running locally)
  private memUsers: Map<string, any> = new Map();
  private memTraineeProfiles: Map<string, any> = new Map();
  private memTrainerProfiles: Map<string, any> = new Map();
  private memSkills: Map<string, any> = new Map();
  private memUserSkills: Map<string, any> = new Map();
  private memCertificates: Map<string, any> = new Map();
  private memCourses: Map<string, any> = new Map();
  private memCourseResources: Map<string, any> = new Map();
  private memEnrollments: Map<string, any> = new Map();
  private memFeedback: Map<string, any> = new Map();
  private memAuditLogs: Map<string, any> = new Map();
  private memAnnouncements: Map<string, any> = new Map();
  private memQuestionBanks: Map<string, any> = new Map();
  private memQuestions: Map<string, any> = new Map();
  private memAiDraftQuestions: Map<string, any> = new Map();
  private memAssessmentAttempts: Map<string, any> = new Map();
  private memBadges: Map<string, any> = new Map();
  private memUserBadges: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'DATABASE_URL',
      'postgresql://syllabiq_user:syllabiq_password@localhost:5432/syllabiq_db',
    );

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      this.logger.log('🧪 Test environment detected — using fast in-memory database store');
      return;
    }

    // 1. Connect to MongoDB Atlas
    const mongoUri =
      this.configService.get<string>('MONGODB_URI') || process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        this.mongoClient = new MongoClient(mongoUri, {
          serverSelectionTimeoutMS: 2500,
          connectTimeoutMS: 3000,
        });
        await this.mongoClient.connect();
        const dbName =
          this.configService.get<string>('MONGODB_DB_NAME') || 'syllabiq';
        this.mongoDb = this.mongoClient.db(dbName);
        await this.mongoDb.command({ ping: 1 });
        this.isMongoConnected = true;
        this.logger.log(`🍃 Successfully connected to MongoDB Atlas database (${dbName})`);
        await this.loadAllCollectionsFromMongo();
      } catch (mongoErr: any) {
        this.isMongoConnected = false;
        this.logger.warn(`MongoDB connection failed: ${mongoErr?.message}`);
      }
    }

    // 2. Connect to PostgreSQL (Optional / Secondary)
    try {
      const client = await this.pool.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to PostgreSQL database');
      client.release();
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        `PostgreSQL not reachable at configured host: ${(error as Error).message}. Running with ${this.isMongoConnected ? 'MongoDB cloud persistence' : 'resilient in-memory database store'}.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end().catch(() => {});
    }
    if (this.mongoClient) {
      await this.mongoClient.close().catch(() => {});
    }
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params: any[] = [],
  ): Promise<QueryResult<T>> {
    if (this.isConnected) {
      try {
        return await this.pool.query<T>(text, params);
      } catch (err) {
        if ((err as any).code === 'ECONNREFUSED' || (err as any).code === 'ETIMEDOUT') {
          this.isConnected = false;
        } else {
          throw err;
        }
      }
    }

    return this.handleInMemoryQuery<T>(text, params);
  }

  private handleInMemoryQuery<T extends QueryResultRow>(
    text: string,
    params: any[],
  ): QueryResult<T> {
    const q = text.trim();
    const rows: any[] = [];

    // 0. Competency Matching Query
    if (q.includes('FROM users u') && q.includes('user_skills us') && q.includes('proficiency_level')) {
      const skillId = params[0];
      const matchedTrainers: any[] = [];

      for (const us of this.memUserSkills.values()) {
        if (us.skill_id === skillId) {
          const user = this.memUsers.get(us.user_id);
          if (user && user.role === 'trainer' && user.status === 'approved') {
            const tp = this.memTrainerProfiles.get(user.id);
            const yearsExp = tp ? Number(tp.years_experience || 0) : 0;
            const bio = tp ? tp.bio : null;

            // Prior courses in skill
            let priorCourses = 0;
            const trainerCourseIds: string[] = [];
            for (const c of this.memCourses.values()) {
              if (c.trainer_id === user.id && c.subject_skill_id === skillId) {
                priorCourses++;
                trainerCourseIds.push(c.id);
              }
            }

            // Feedback in skill
            let totalRating = 0;
            let ratingCount = 0;
            for (const f of this.memFeedback.values()) {
              if (trainerCourseIds.includes(f.course_id)) {
                totalRating += Number(f.rating);
                ratingCount++;
              }
            }
            const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

            matchedTrainers.push({
              trainer_id: user.id,
              trainer_name: user.name,
              trainer_email: user.email,
              years_experience: yearsExp,
              bio,
              proficiency_level: us.proficiency_level,
              skill_source: us.source,
              prior_courses_in_skill: priorCourses,
              avg_rating_in_skill: avgRating,
              rating_count: ratingCount,
            });
          }
        }
      }
      return {
        rows: matchedTrainers,
        command: 'SELECT',
        rowCount: matchedTrainers.length,
        oid: 0,
        fields: [],
      } as QueryResult<T>;
    }

    // 0.5. Dashboard Aggregates Queries (Checked first to avoid matching generic single-table queries)
    if (q.includes('COUNT(*)::int as total_enrollments') || q.includes('DATE_TRUNC(\'day\', e.enrolled_at)') || (q.includes('FROM courses c') && q.includes('INNER JOIN enrollments e'))) {
      const from = params[0] ? new Date(params[0]) : null;
      const to = params[1] ? new Date(params[1]) : null;

      let enrollmentsList = Array.from(this.memEnrollments.values());
      if (from) enrollmentsList = enrollmentsList.filter((e) => new Date(e.enrolled_at) >= from);
      if (to) enrollmentsList = enrollmentsList.filter((e) => new Date(e.enrolled_at) <= to);

      if (q.includes('COUNT(*)::int as total_enrollments')) {
        const total = enrollmentsList.length;
        const active = enrollmentsList.filter((e) => e.status === 'active').length;
        const completed = enrollmentsList.filter((e) => e.status === 'completed').length;
        const dropped = enrollmentsList.filter((e) => e.status === 'dropped').length;
        const avgProg = total > 0 ? enrollmentsList.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / total : 0;
        rows.push({
          total_enrollments: total,
          active_enrollments: active,
          completed_enrollments: completed,
          dropped_enrollments: dropped,
          avg_progress_percent: avgProg,
        });
      } else if (q.includes('DATE_TRUNC(\'day\', e.enrolled_at)')) {
        const map = new Map<string, number>();
        for (const e of enrollmentsList) {
          const key = new Date(e.enrolled_at).toISOString().split('T')[0];
          map.set(key, (map.get(key) || 0) + 1);
        }
        for (const [bucket, count] of Array.from(map.entries()).sort()) {
          rows.push({ bucket, count });
        }
      } else if (q.includes('FROM courses c') && q.includes('INNER JOIN enrollments e')) {
        for (const c of this.memCourses.values()) {
          let enrollCount = 0;
          let compCount = 0;
          for (const e of this.memEnrollments.values()) {
            if (e.course_id === c.id) {
              enrollCount++;
              if (e.status === 'completed') compCount++;
            }
          }
          if (enrollCount > 0) {
            rows.push({
              course_id: c.id,
              course_title: c.title,
              enrollment_count: enrollCount,
              completed_count: compCount,
            });
          }
        }
      }
      return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] } as QueryResult<T>;
    }

    if (q.includes('COUNT(*)::int as total_certificates_issued') || q.includes('DATE_TRUNC(\'day\', cert.created_at)') || (q.includes('FROM certificates cert') && q.includes('LEFT JOIN courses c'))) {
      const from = params[0] ? new Date(params[0]) : null;
      const to = params[1] ? new Date(params[1]) : null;

      let certList = Array.from(this.memCertificates.values());
      if (from) certList = certList.filter((c) => new Date(c.created_at) >= from);
      if (to) certList = certList.filter((c) => new Date(c.created_at) <= to);

      if (q.includes('COUNT(*)::int as total_certificates_issued')) {
        const total = certList.length;
        const uniqueUsers = new Set(certList.map((c) => c.user_id)).size;
        const distinctCourses = new Set(certList.filter((c) => c.course_id).map((c) => c.course_id)).size;
        rows.push({
          total_certificates_issued: total,
          unique_certified_trainees: uniqueUsers,
          certified_courses_count: distinctCourses,
        });
      } else if (q.includes('DATE_TRUNC(\'day\', cert.created_at)')) {
        const map = new Map<string, number>();
        for (const c of certList) {
          const key = new Date(c.created_at).toISOString().split('T')[0];
          map.set(key, (map.get(key) || 0) + 1);
        }
        for (const [bucket, count] of Array.from(map.entries()).sort()) {
          rows.push({ bucket, count });
        }
      } else if (q.includes('FROM certificates cert') && q.includes('LEFT JOIN courses c')) {
        const courseCertMap = new Map<string, { id: string; title: string; count: number }>();
        for (const cert of this.memCertificates.values()) {
          const c = cert.course_id ? this.memCourses.get(cert.course_id) : null;
          const title = c ? c.title : (cert.title || 'External Certification');
          const id = c ? c.id : (cert.course_id || '00000000-0000-0000-0000-000000000000');
          const entry = courseCertMap.get(title) || { id, title, count: 0 };
          entry.count++;
          courseCertMap.set(title, entry);
        }
        for (const item of courseCertMap.values()) {
          rows.push({
            course_id: item.id,
            course_title: item.title,
            count: item.count,
          });
        }
      }
      return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] } as QueryResult<T>;
    }

    if (q.includes('COUNT(*)::int as total_attempts') || (q.includes('FROM question_banks qb') && q.includes('JOIN courses c')) || (q.includes('FROM skills s') && q.includes('JOIN courses c') && q.includes('JOIN question_banks qb'))) {
      const from = params[0] ? new Date(params[0]) : null;
      const to = params[1] ? new Date(params[1]) : null;

      let attList = Array.from(this.memAssessmentAttempts.values()).filter((a) => a.submitted_at !== null);
      if (from) attList = attList.filter((a) => new Date(a.submitted_at) >= from);
      if (to) attList = attList.filter((a) => new Date(a.submitted_at) <= to);

      if (q.includes('COUNT(*)::int as total_attempts')) {
        const total = attList.length;
        const passed = attList.filter((a) => a.passed === true).length;
        const failed = attList.filter((a) => a.passed === false).length;
        const avgScore = total > 0 ? attList.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / total : 0;
        const passRate = total > 0 ? (passed / total) * 100 : 0;
        rows.push({
          total_attempts: total,
          passed_attempts: passed,
          failed_attempts: failed,
          avg_score: avgScore,
          overall_pass_rate: passRate,
        });
      } else if (q.includes('FROM skills s') && q.includes('JOIN courses c') && q.includes('JOIN question_banks qb')) {
        for (const s of this.memSkills.values()) {
          const skillCourses = Array.from(this.memCourses.values()).filter((c) => c.subject_skill_id === s.id);
          const qbIds = Array.from(this.memQuestionBanks.values())
            .filter((qb) => skillCourses.some((c) => c.id === qb.course_id))
            .map((qb) => qb.id);
          const attempts = Array.from(this.memAssessmentAttempts.values()).filter(
            (a) => qbIds.includes(a.question_bank_id) && a.submitted_at !== null,
          );
          if (attempts.length > 0) {
            const passed = attempts.filter((a) => a.passed === true).length;
            const avgScore = attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / attempts.length;
            const passRate = (passed / attempts.length) * 100;
            rows.push({
              skill_id: s.id,
              skill_name: s.name,
              skill_category: s.category,
              attempt_count: attempts.length,
              avg_score: avgScore,
              pass_rate: passRate,
            });
          }
        }
      } else if (q.includes('FROM question_banks qb') && q.includes('JOIN courses c')) {
        for (const qb of this.memQuestionBanks.values()) {
          const c = this.memCourses.get(qb.course_id);
          const attempts = Array.from(this.memAssessmentAttempts.values()).filter((a) => a.question_bank_id === qb.id && a.submitted_at !== null);
          const passed = attempts.filter((a) => a.passed === true).length;
          const failed = attempts.filter((a) => a.passed === false).length;
          const avgScore = attempts.length > 0 ? attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / attempts.length : 0;
          const passRate = attempts.length > 0 ? (passed / attempts.length) * 100 : 0;
          rows.push({
            course_id: c ? c.id : qb.course_id,
            course_title: c ? c.title : 'Course',
            question_bank_id: qb.id,
            question_bank_title: qb.title,
            id: qb.id,
            title: qb.title,
            attempt_count: attempts.length,
            passed_count: passed,
            failed_count: failed,
            avg_score: avgScore,
            pass_rate: passRate,
          });
        }
      }
      return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] } as QueryResult<T>;
    }

    if ((q.includes('COUNT(*)::int as total_users') && q.includes('active_user_count')) || (q.includes('s.category') && q.includes('total_tagged')) || (q.includes('c.id as course_id') && q.includes('activity_score'))) {
      if (q.includes('COUNT(*)::int as total_users')) {
        const usersList = Array.from(this.memUsers.values());
        const total = usersList.length;
        const trainees = usersList.filter((u) => u.role === 'trainee').length;
        const trainers = usersList.filter((u) => u.role === 'trainer').length;
        const admins = usersList.filter((u) => u.role === 'admin').length;
        const pending = usersList.filter((u) => u.status === 'pending').length;
        const approved = usersList.filter((u) => u.status === 'approved').length;
        const activeCount = approved;

        rows.push({
          total_users: total,
          trainee_count: trainees,
          trainer_count: trainers,
          admin_count: admins,
          pending_approval_count: pending,
          approved_count: approved,
          active_user_count: activeCount,
        });
      } else if (q.includes('s.category') && q.includes('total_tagged')) {
        const catMap = new Map<string, { beginner: number; intermediate: number; advanced: number; expert: number; total: number }>();
        for (const skill of this.memSkills.values()) {
          const cat = skill.category || 'General';
          if (!catMap.has(cat)) {
            catMap.set(cat, { beginner: 0, intermediate: 0, advanced: 0, expert: 0, total: 0 });
          }
        }
        for (const us of this.memUserSkills.values()) {
          const skill = this.memSkills.get(us.skill_id);
          const cat = skill?.category || 'General';
          const entry = catMap.get(cat) || { beginner: 0, intermediate: 0, advanced: 0, expert: 0, total: 0 };
          const lvl = (us.proficiency_level || 'beginner').toLowerCase();
          if (lvl === 'beginner') entry.beginner++;
          else if (lvl === 'intermediate') entry.intermediate++;
          else if (lvl === 'advanced') entry.advanced++;
          else if (lvl === 'expert') entry.expert++;
          entry.total++;
          catMap.set(cat, entry);
        }
        for (const [cat, data] of catMap.entries()) {
          rows.push({
            category: cat,
            beginner: data.beginner,
            intermediate: data.intermediate,
            advanced: data.advanced,
            expert: data.expert,
            total_tagged: data.total,
          });
        }
      } else if (q.includes('c.id as course_id') && q.includes('activity_score')) {
        for (const c of this.memCourses.values()) {
          const trainer = this.memUsers.get(c.trainer_id);
          const skill = c.subject_skill_id ? this.memSkills.get(c.subject_skill_id) : null;
          let enrollCount = 0;
          let compCount = 0;
          for (const e of this.memEnrollments.values()) {
            if (e.course_id === c.id) {
              enrollCount++;
              if (e.status === 'completed') compCount++;
            }
          }
          rows.push({
            course_id: c.id,
            course_title: c.title,
            trainer_name: trainer ? trainer.name : 'Faculty Trainer',
            skill_name: skill ? skill.name : 'General Meteorology',
            total_enrollments: enrollCount,
            total_completions: compCount,
            activity_score: enrollCount + compCount,
          });
        }
      }
      return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] } as QueryResult<T>;
    }

    // 1. Users Queries
    if (q.includes('FROM users') || q.startsWith('INSERT INTO users') || q.startsWith('UPDATE users')) {
      if (q.startsWith('INSERT INTO users')) {
        const id = crypto.randomUUID();
        const user = {
          id,
          name: params[0],
          email: params[1],
          password_hash: params[2],
          role: params[3],
          status: params[4],
          is_email_verified: params[5] ?? false,
          email_verification_token: params[6] ?? null,
          email_verification_expires: params[7] ?? null,
          password_reset_token: null,
          password_reset_expires: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        this.memUsers.set(id, user);
        this.persistToMongo('users', id, user);
        rows.push({ ...user });
      } else if (q.startsWith("SELECT id FROM users WHERE role = 'admin'")) {
        const admin = Array.from(this.memUsers.values()).find((u) => u.role === 'admin');
        if (admin) rows.push({ id: admin.id });
      } else if (q.includes('WHERE email =')) {
        let email = '';
        if (q.includes('WHERE email = $1')) {
          email = (params[0] || '').toLowerCase().trim();
        } else {
          const match = q.match(/WHERE email\s*=\s*'([^']+)'/i);
          if (match) email = match[1].toLowerCase().trim();
        }
        const user = Array.from(this.memUsers.values()).find((u) => u.email.toLowerCase() === email);
        if (user) rows.push({ ...user });
      } else if (q.includes('WHERE id = $1') && !q.startsWith('UPDATE')) {
        const user = this.memUsers.get(params[0]);
        if (user) rows.push({ ...user });
      } else if (q.startsWith('UPDATE users')) {
        if (q.includes('SET name = $1')) {
          const user = this.memUsers.get(params[1]);
          if (user) {
            user.name = params[0];
            user.updated_at = new Date();
            this.persistToMongo('users', user.id, user);
            rows.push({ ...user });
          }
        } else if (q.includes("SET status = 'approved'") || q.includes("SET status = 'rejected'")) {
          const user = this.memUsers.get(params[0]);
          if (user) {
            user.status = q.includes('approved') ? 'approved' : 'rejected';
            user.updated_at = new Date();
            this.persistToMongo('users', user.id, user);
            rows.push({ ...user });
          }
        } else if (q.includes('SET role = $1')) {
          const user = this.memUsers.get(params[1]);
          if (user) {
            user.role = params[0];
            user.updated_at = new Date();
            this.persistToMongo('users', user.id, user);
            rows.push({ ...user });
          }
        } else if (q.includes('password_reset_token = $1')) {
          const user = this.memUsers.get(params[2]);
          if (user) {
            user.password_reset_token = params[0];
            user.password_reset_expires = params[1];
            user.updated_at = new Date();
            this.persistToMongo('users', user.id, user);
            rows.push({ ...user });
          }
        } else if (q.includes('password_hash = $1')) {
          const user = this.memUsers.get(params[1]);
          if (user) {
            user.password_hash = params[0];
            user.password_reset_token = null;
            user.password_reset_expires = null;
            user.updated_at = new Date();
            this.persistToMongo('users', user.id, user);
            rows.push({ ...user });
          }
        } else if (q.includes('is_email_verified = TRUE')) {
          const user = this.memUsers.get(params[0]);
          if (user) {
            user.is_email_verified = true;
            user.email_verification_token = null;
            this.persistToMongo('users', user.id, user);
            rows.push({ ...user });
          }
        }
      } else if (q.includes('WHERE password_reset_token = $1')) {
        const user = Array.from(this.memUsers.values()).find((u) => u.password_reset_token === params[0]);
        if (user) rows.push({ ...user });
      } else {
        let all = Array.from(this.memUsers.values()).map((u) => {
          let bio = null;
          let yearsExp = null;
          if (u.role === 'trainee') {
            const tp = this.memTraineeProfiles.get(u.id);
            bio = tp ? tp.bio : null;
          } else if (u.role === 'trainer') {
            const trp = this.memTrainerProfiles.get(u.id);
            bio = trp ? trp.bio : null;
            yearsExp = trp ? trp.years_experience : null;
          }
          return {
            ...u,
            bio,
            years_experience: yearsExp,
          };
        });

        // Apply filters if query had parameters
        if (q.includes('u.status = $') && params.length > 0) {
          const statusIdx = q.includes('u.status = $1') ? 0 : 0;
          all = all.filter((u) => u.status === params[statusIdx]);
        }
        if (q.includes('u.role = $')) {
          all = all.filter((u) => params.includes(u.role));
        }
        rows.push(...all);
      }
    }

    // 2. Skills Queries
    else if (q.includes('FROM skills') || q.startsWith('INSERT INTO skills')) {
      if (q.startsWith('INSERT INTO skills')) {
        const existing = Array.from(this.memSkills.values()).find((s) => s.name === params[0]);
        if (existing) {
          if (!q.includes('ON CONFLICT DO NOTHING')) {
            rows.push(existing);
          }
        } else {
          const id = crypto.randomUUID();
          const s = { id, name: params[0], category: params[1] };
          this.memSkills.set(id, s);
          this.persistToMongo('skills', id, s);
          rows.push(s);
        }
      } else if (q.includes('SELECT count(*)::int')) {
        rows.push({ count: this.memSkills.size });
      } else if (q.includes('WHERE name = $1')) {
        const s = Array.from(this.memSkills.values()).find((item) => item.name.toLowerCase() === (params[0] || '').toLowerCase());
        if (s) rows.push({ ...s });
      } else if (q.includes('WHERE id = $1')) {
        const s = this.memSkills.get(params[0]);
        if (s) rows.push({ ...s });
      } else if (q.includes('WHERE category ILIKE $1')) {
        const cat = (params[0] || '').replace(/%/g, '').toLowerCase();
        const filtered = Array.from(this.memSkills.values()).filter((item) => item.category.toLowerCase() === cat);
        rows.push(...filtered.map((item) => ({ ...item })));
      } else {
        rows.push(...Array.from(this.memSkills.values()).map((item) => ({ ...item })));
      }
    }

    // 3. User Skills Queries
    else if (q.includes('FROM user_skills') || q.startsWith('INSERT INTO user_skills') || q.startsWith('DELETE FROM user_skills')) {
      if (q.startsWith('INSERT INTO user_skills')) {
        const userId = params[0];
        const skillId = params[1];
        const proficiencyLevel = params[2];
        const source = params[3];
        const key = `${userId}_${skillId}`;

        let item = this.memUserSkills.get(key);
        if (item) {
          item.proficiency_level = proficiencyLevel;
          item.source = source;
        } else {
          item = {
            id: crypto.randomUUID(),
            user_id: userId,
            skill_id: skillId,
            proficiency_level: proficiencyLevel,
            source,
          };
          this.memUserSkills.set(key, item);
        }
        this.persistToMongo('user_skills', item.id, item);
        rows.push({ ...item });
      } else if (q.startsWith('DELETE FROM user_skills')) {
        const userId = params[0];
        const skillId = params[1];
        const key = `${userId}_${skillId}`;
        if (this.memUserSkills.has(key)) {
          const item = this.memUserSkills.get(key);
          this.memUserSkills.delete(key);
          this.deleteFromMongo('user_skills', item.id);
          rows.push({ id: item.id });
        }
      } else if (q.includes('WHERE us.user_id = $1')) {
        const userId = params[0];
        for (const us of this.memUserSkills.values()) {
          if (us.user_id === userId) {
            const skill = this.memSkills.get(us.skill_id);
            rows.push({
              id: us.id,
              skill_id: us.skill_id,
              name: skill ? skill.name : 'Unknown Skill',
              category: skill ? skill.category : 'General',
              proficiency_level: us.proficiency_level,
              source: us.source,
            });
          }
        }
      }
    }

    // 4. Trainee Profiles
    else if (q.includes('FROM trainee_profiles') || q.startsWith('INSERT INTO trainee_profiles')) {
      if (q.startsWith('INSERT INTO trainee_profiles')) {
        const userId = params[0];
        const bio = params[1];
        let quals = [];
        let workExp = [];
        let interests = [];

        try { quals = params[2] ? JSON.parse(params[2]) : []; } catch { quals = []; }
        try { workExp = params[3] ? JSON.parse(params[3]) : []; } catch { workExp = []; }
        interests = Array.isArray(params[4]) ? params[4] : [];

        let p = this.memTraineeProfiles.get(userId);
        if (p) {
          if (bio !== null && bio !== undefined) p.bio = bio;
          if (params[2] !== null && params[2] !== undefined) p.qualifications = quals;
          if (params[3] !== null && params[3] !== undefined) p.work_experience = workExp;
          if (params[4] !== null && params[4] !== undefined) p.interests = interests;
        } else {
          p = {
            id: crypto.randomUUID(),
            user_id: userId,
            bio,
            qualifications: quals,
            work_experience: workExp,
            interests,
          };
          this.memTraineeProfiles.set(userId, p);
        }
        this.persistToMongo('trainee_profiles', userId, p);
        rows.push({ ...p });
      } else if (q.includes('WHERE user_id = $1')) {
        const p = this.memTraineeProfiles.get(params[0]);
        if (p) rows.push({ ...p });
      }
    }

    // 5. Trainer Profiles
    else if (q.includes('FROM trainer_profiles') || q.startsWith('INSERT INTO trainer_profiles') || q.startsWith('UPDATE trainer_profiles')) {
      if (q.startsWith('INSERT INTO trainer_profiles')) {
        const userId = params[0];
        const bio = params[1];
        const yearsExp = params[2] ?? 0;
        let quals = [];
        try { quals = params[3] ? JSON.parse(params[3]) : []; } catch { quals = []; }

        let p = this.memTrainerProfiles.get(userId);
        if (p) {
          if (bio !== null && bio !== undefined) p.bio = bio;
          if (params[2] !== null && params[2] !== undefined) p.years_experience = yearsExp;
          if (params[3] !== null && params[3] !== undefined) p.qualifications = quals;
        } else {
          p = {
            id: crypto.randomUUID(),
            user_id: userId,
            bio,
            years_experience: yearsExp,
            qualifications: quals,
          };
          this.memTrainerProfiles.set(userId, p);
        }
        this.persistToMongo('trainer_profiles', userId, p);
        rows.push({ ...p });
      } else if (q.startsWith('UPDATE trainer_profiles')) {
        let yearsExp = 0;
        let userId = '';
        if (q.includes('SET years_experience = $1 WHERE user_id = $2')) {
          yearsExp = Number(params[0]);
          userId = params[1];
        } else {
          const m = q.match(/SET\s+years_experience\s*=\s*(\d+)/i);
          if (m) yearsExp = parseInt(m[1], 10);
          userId = params[0];
        }
        let p = this.memTrainerProfiles.get(userId);
        if (p) {
          p.years_experience = yearsExp;
        } else {
          p = {
            id: crypto.randomUUID(),
            user_id: userId,
            years_experience: yearsExp,
            bio: null,
            qualifications: [],
          };
          this.memTrainerProfiles.set(userId, p);
        }
        this.persistToMongo('trainer_profiles', userId, p);
        rows.push({ ...p });
      } else if (q.includes('WHERE user_id = $1')) {
        const p = this.memTrainerProfiles.get(params[0]);
        if (p) rows.push({ ...p });
      }
    }

    // 6. Certificates
    else if (q.includes('FROM certificates') || q.startsWith('INSERT INTO certificates')) {
      if (q.startsWith('INSERT INTO certificates')) {
        const id = crypto.randomUUID();
        const verificationCode = params[4]?.startsWith('CERT-')
          ? params[4]
          : params[5]?.startsWith('CERT-')
          ? params[5]
          : `CERT-MOES-2026-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

        const cert = {
          id,
          user_id: params[0],
          title: params[1],
          issuing_body: params[2] || 'Ministry of Earth Sciences (MoES)',
          issue_date: params[3] instanceof Date ? params[3] : new Date(),
          file_url: params[4] && !params[4].startsWith('CERT-') ? params[4] : null,
          course_id: params[5] && !params[5].startsWith('CERT-') ? params[5] : params[3] || null,
          verification_code: verificationCode,
          created_at: new Date(),
        };
        this.memCertificates.set(id, cert);
        this.persistToMongo('certificates', id, cert);
        rows.push({ ...cert });
      } else if (q.includes('WHERE c.verification_code = $1') || q.includes('c.id::text = $1')) {
        const code = params[0];
        for (const c of this.memCertificates.values()) {
          if (c.verification_code === code || c.id === code) {
            const user = this.memUsers.get(c.user_id);
            const course = c.course_id ? this.memCourses.get(c.course_id) : null;
            rows.push({
              ...c,
              trainee_name: user ? user.name : 'Trainee Officer',
              trainee_email: user ? user.email : 'trainee@moes.gov.in',
              course_title: course ? course.title : c.title,
            });
            break;
          }
        }
      } else if (q.includes('WHERE user_id = $1')) {
        const userId = params[0];
        for (const c of this.memCertificates.values()) {
          if (c.user_id === userId) {
            rows.push({ ...c });
          }
        }
      }
    }

    // 6.5. Badges & Gamification
    else if (q.includes('FROM badges') || q.startsWith('INSERT INTO badges') || q.includes('FROM user_badges') || q.startsWith('INSERT INTO user_badges')) {
      if (q.startsWith('INSERT INTO badges')) {
        const id = crypto.randomUUID();
        const b = {
          id,
          code: params[0],
          title: params[1],
          description: params[2],
          icon: params[3],
          criteria: params[4],
          category: params[5] || 'milestone',
          created_at: new Date(),
        };
        this.memBadges.set(b.code, b);
        this.persistToMongo('badges', b.code, b);
        rows.push(b);
      } else if (q.startsWith('INSERT INTO user_badges')) {
        const userId = params[0];
        const badgeId = params[1];
        const key = `${userId}_${badgeId}`;
        let ub = this.memUserBadges.get(key);
        if (!ub) {
          ub = {
            id: crypto.randomUUID(),
            user_id: userId,
            badge_id: badgeId,
            awarded_at: new Date(),
            metadata: params[2] || {},
          };
          this.memUserBadges.set(key, ub);
        }
        this.persistToMongo('user_badges', ub.id, ub);
        rows.push({ ...ub });
      } else if (q.includes('FROM user_badges')) {
        const userId = params[0];
        for (const ub of this.memUserBadges.values()) {
          if (ub.user_id === userId) {
            let badge = Array.from(this.memBadges.values()).find((b) => b.id === ub.badge_id);
            if (!badge) {
              badge = {
                id: ub.badge_id,
                code: 'milestone_achiever',
                title: 'Milestone Achiever',
                description: 'Capacity building milestone awarded',
                icon: 'Award',
                criteria: 'Course milestone completed',
                category: 'milestone',
              };
            }
            rows.push({
              ...badge,
              awarded_at: ub.awarded_at,
              metadata: ub.metadata,
            });
          }
        }
      } else if (q.includes('WHERE code = $1')) {
        const code = params[0];
        const b = this.memBadges.get(code);
        if (b) rows.push(b);
      } else {
        rows.push(...Array.from(this.memBadges.values()));
      }
    }

    // 7. Courses Queries
    else if (q.includes('FROM courses') || q.startsWith('INSERT INTO courses') || q.startsWith('UPDATE courses') || q.startsWith('DELETE FROM courses')) {
      if (q.startsWith('INSERT INTO courses')) {
        const id = crypto.randomUUID();
        let title = 'Course';
        let description: string | null = null;
        let trainer_id = '';
        let subject_skill_id: string | null = null;
        let difficulty = 'beginner';
        let status = 'draft';

        if (params.length >= 6) {
          title = params[0];
          description = params[1] || null;
          trainer_id = params[2];
          subject_skill_id = params[3] || null;
          difficulty = params[4] || 'beginner';
          status = params[5] || 'draft';
        } else if (params.length === 2) {
          trainer_id = params[0];
          subject_skill_id = params[1];
        }
        const course = {
          id,
          title,
          description,
          trainer_id,
          subject_skill_id,
          difficulty,
          status,
          created_at: new Date(),
          updated_at: new Date(),
        };
        this.memCourses.set(id, course);
        this.persistToMongo('courses', id, course);
        rows.push({ ...course });
      } else if (q.startsWith('UPDATE courses')) {
        if (q.includes('SET trainer_id = $1')) {
          const trainerId = params[0];
          const courseId = params[1];
          const course = this.memCourses.get(courseId);
          if (course) {
            course.trainer_id = trainerId;
            course.updated_at = new Date();
            this.persistToMongo('courses', course.id, course);
            rows.push({ ...course });
          }
        } else if (q.includes('SET title = COALESCE($1, title)')) {
          const courseId = params[5];
          const course = this.memCourses.get(courseId);
          if (course) {
            if (params[0]) course.title = params[0];
            if (params[1]) course.description = params[1];
            if (params[2]) course.subject_skill_id = params[2];
            if (params[3]) course.difficulty = params[3];
            if (params[4]) course.status = params[4];
            course.updated_at = new Date();
            this.persistToMongo('courses', course.id, course);
            rows.push({ ...course });
          }
        } else if (q.includes("SET status = 'archived'")) {
          const courseId = params[0];
          const course = this.memCourses.get(courseId);
          if (course) {
            course.status = 'archived';
            course.updated_at = new Date();
            this.persistToMongo('courses', course.id, course);
            rows.push({ ...course });
          }
        }
      } else if (q.startsWith('DELETE FROM courses')) {
        const courseId = params[0];
        this.memCourses.delete(courseId);
        this.deleteFromMongo('courses', courseId);
        rows.push({ id: courseId });
      } else if (q.includes('WHERE c.id = $1') || q.includes('WHERE id = $1')) {
        const courseId = params[0];
        const course = this.memCourses.get(courseId);
        if (course) {
          const trainer = this.memUsers.get(course.trainer_id);
          const skill = course.subject_skill_id ? this.memSkills.get(course.subject_skill_id) : null;
          let enrollmentsCount = 0;
          for (const e of this.memEnrollments.values()) {
            if (e.course_id === courseId) enrollmentsCount++;
          }
          rows.push({
            ...course,
            trainer_name: trainer ? trainer.name : 'Unknown Trainer',
            trainer_email: trainer ? trainer.email : '',
            skill_id: skill ? skill.id : null,
            skill_name: skill ? skill.name : null,
            skill_category: skill ? skill.category : null,
            avg_rating: 4.8,
            enrollment_count: enrollmentsCount,
          });
        }
      } else {
        // Multi-course listing
        for (const course of this.memCourses.values()) {
          const trainer = this.memUsers.get(course.trainer_id);
          const skill = course.subject_skill_id ? this.memSkills.get(course.subject_skill_id) : null;
          let enrollmentsCount = 0;
          for (const e of this.memEnrollments.values()) {
            if (e.course_id === course.id) enrollmentsCount++;
          }

          let matches = true;
          if (q.includes("c.status = 'published'") && course.status !== 'published') {
            matches = false;
          }

          if (matches) {
            rows.push({
              ...course,
              trainer_name: trainer ? trainer.name : 'Trainer',
              trainer_email: trainer ? trainer.email : '',
              skill_id: skill ? skill.id : null,
              skill_name: skill ? skill.name : null,
              skill_category: skill ? skill.category : null,
              avg_rating: 4.8,
              enrollment_count: enrollmentsCount,
            });
          }
        }
      }
    }

    // 8. Course Resources Queries
    else if (q.includes('FROM course_resources') || q.startsWith('INSERT INTO course_resources') || q.startsWith('DELETE FROM course_resources')) {
      if (q.startsWith('INSERT INTO course_resources')) {
        const id = crypto.randomUUID();
        const res = {
          id,
          course_id: params[0],
          type: params[1],
          file_url: params[2],
          title: params[3],
          uploaded_at: new Date(),
        };
        this.memCourseResources.set(id, res);
        this.persistToMongo('course_resources', id, res);
        rows.push({ ...res });
      } else if (q.startsWith('DELETE FROM course_resources')) {
        const resourceId = params[0];
        const courseId = params[1];
        const res = this.memCourseResources.get(resourceId);
        if (res && res.course_id === courseId) {
          this.memCourseResources.delete(resourceId);
          this.deleteFromMongo('course_resources', resourceId);
          rows.push({ id: resourceId });
        }
      } else if (q.includes('SELECT count(*)::int')) {
        const courseId = params[0];
        let count = 0;
        for (const r of this.memCourseResources.values()) {
          if (r.course_id === courseId) count++;
        }
        rows.push({ count });
      } else if (q.includes('WHERE course_id = $1')) {
        const courseId = params[0];
        for (const r of this.memCourseResources.values()) {
          if (r.course_id === courseId) {
            rows.push({ ...r });
          }
        }
      }
    }

    // 9. Enrollments Queries
    else if (q.includes('FROM enrollments') || q.startsWith('INSERT INTO enrollments') || q.startsWith('UPDATE enrollments')) {
      if (q.startsWith('INSERT INTO enrollments')) {
        const id = crypto.randomUUID();
        const enroll = {
          id,
          course_id: params[0],
          trainee_id: params[1],
          status: 'active',
          progress_percent: 0,
          enrolled_at: new Date(),
          completed_at: null,
        };
        this.memEnrollments.set(id, enroll);
        this.persistToMongo('enrollments', id, enroll);
        rows.push({ ...enroll });
      } else if (q.startsWith('UPDATE enrollments')) {
        if (q.includes('progress_percent = $1')) {
          const enrollId = params[2];
          const enroll = this.memEnrollments.get(enrollId);
          if (enroll) {
            enroll.progress_percent = params[0];
            enroll.status = params[1];
            if (q.includes('completed_at = NOW()')) enroll.completed_at = new Date();
            this.persistToMongo('enrollments', enroll.id, enroll);
            rows.push({ ...enroll });
          }
        } else if (q.includes('status = $1')) {
          const enrollId = params[1];
          const enroll = this.memEnrollments.get(enrollId);
          if (enroll) {
            enroll.status = params[0];
            this.persistToMongo('enrollments', enroll.id, enroll);
            rows.push({ ...enroll });
          }
        }
      } else if (q.includes('WHERE course_id = $1 AND trainee_id = $2')) {
        const courseId = params[0];
        const traineeId = params[1];
        for (const e of this.memEnrollments.values()) {
          if (e.course_id === courseId && e.trainee_id === traineeId) {
            if (q.includes("status != 'dropped'") && e.status === 'dropped') continue;
            if (q.includes("status IN ('active', 'completed')") && !['active', 'completed'].includes(e.status)) continue;
            rows.push({ ...e });
          }
        }
      } else if (q.includes('SELECT count(*)::int as count FROM enrollments WHERE course_id = $1')) {
        const courseId = params[0];
        let count = 0;
        for (const e of this.memEnrollments.values()) {
          if (e.course_id === courseId) count++;
        }
        rows.push({ count });
      } else if (q.includes('WHERE e.trainee_id = $1')) {
        const traineeId = params[0];
        for (const e of this.memEnrollments.values()) {
          if (e.trainee_id === traineeId) {
            const course = this.memCourses.get(e.course_id);
            const trainer = course ? this.memUsers.get(course.trainer_id) : null;
            const skill = course && course.subject_skill_id ? this.memSkills.get(course.subject_skill_id) : null;
            rows.push({
              enrollment_id: e.id,
              enrolled_at: e.enrolled_at,
              enrollment_status: e.status,
              progress_percent: e.progress_percent,
              course_id: course ? course.id : e.course_id,
              course_title: course ? course.title : 'Course',
              course_description: course ? course.description : '',
              difficulty: course ? course.difficulty : 'intermediate',
              course_status: course ? course.status : 'published',
              trainer_id: trainer ? trainer.id : '',
              trainer_name: trainer ? trainer.name : 'Trainer',
              skill_id: skill ? skill.id : null,
              skill_name: skill ? skill.name : null,
              skill_category: skill ? skill.category : null,
            });
          }
        }
      } else if (q.includes('WHERE e.course_id = $1')) {
        const courseId = params[0];
        for (const e of this.memEnrollments.values()) {
          if (e.course_id === courseId) {
            const user = this.memUsers.get(e.trainee_id);
            rows.push({
              enrollment_id: e.id,
              enrolled_at: e.enrolled_at,
              status: e.status,
              progress_percent: e.progress_percent,
              trainee_id: e.trainee_id,
              trainee_name: user ? user.name : 'Trainee',
              trainee_email: user ? user.email : '',
            });
          }
        }
      } else if (q.includes('WHERE id = $1')) {
        const enroll = this.memEnrollments.get(params[0]);
        if (enroll) rows.push({ ...enroll });
      }
    }

    // 10a. Assessment Attempts (Checked before question_banks to correctly handle JOINs)
    else if (q.includes('assessment_attempts')) {
      if (q.startsWith('INSERT INTO assessment_attempts')) {
        const id = crypto.randomUUID();
        const attempt = {
          id,
          question_bank_id: params[0],
          trainee_id: params[1],
          started_at: new Date(),
          submitted_at: null,
          score: 0,
          passed: false,
          answers: {},
        };
        this.memAssessmentAttempts.set(id, attempt);
        this.persistToMongo('assessment_attempts', id, attempt);
        rows.push({ ...attempt });
      } else if (q.startsWith('UPDATE assessment_attempts')) {
        const id = params[3] || params[params.length - 1];
        const attempt = this.memAssessmentAttempts.get(id);
        if (attempt) {
          attempt.submitted_at = new Date();
          attempt.score = params[0];
          attempt.passed = params[1];
          attempt.answers = typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2];
          this.persistToMongo('assessment_attempts', attempt.id, attempt);
          rows.push({ ...attempt });
        }
      } else if (q.includes('WHERE a.id = $1') || q.includes('WHERE id = $1')) {
        const attempt = this.memAssessmentAttempts.get(params[0]);
        if (attempt) {
          const qb = this.memQuestionBanks.get(attempt.question_bank_id) || {};
          rows.push({
            ...attempt,
            pass_percentage: qb.pass_percentage ?? 60,
            time_limit_minutes: qb.time_limit_minutes ?? 30,
            course_id: qb.course_id,
            qb_title: qb.title || 'Assessment',
            question_bank_title: qb.title || 'Assessment',
          });
        }
      } else if (q.includes('WHERE question_bank_id = $1 AND trainee_id = $2') || q.includes('WHERE a.question_bank_id = $1 AND a.trainee_id = $2')) {
        const qbId = params[0];
        const traineeId = params[1];
        let attempts = Array.from(this.memAssessmentAttempts.values()).filter(
          (a) => a.question_bank_id === qbId && a.trainee_id === traineeId,
        );
        if (q.includes('submitted_at IS NULL')) {
          attempts = attempts.filter((a) => a.submitted_at === null);
        }
        rows.push(...attempts);
      } else {
        rows.push(...Array.from(this.memAssessmentAttempts.values()));
      }
    }

    // 10a-2. AI Draft Questions
    else if (q.includes('ai_draft_questions')) {
      if (q.startsWith('INSERT INTO ai_draft_questions')) {
        const id = crypto.randomUUID();
        const draft = {
          id,
          question_bank_id: params[0],
          text: params[1],
          options: typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2],
          correct_option_id: params[3],
          explanation: params[4] || null,
          source: params[5] || 'ai_generated',
          status: params[6] || 'pending_review',
          created_at: new Date(),
          updated_at: new Date(),
        };
        this.memAiDraftQuestions.set(id, draft);
        this.persistToMongo('ai_draft_questions', id, draft);
        rows.push({ ...draft });
      } else if (q.startsWith('UPDATE ai_draft_questions')) {
        const draftId = params[4] || params[params.length - 1];
        const draft = this.memAiDraftQuestions.get(draftId);
        if (draft) {
          if (params[0]) draft.text = params[0];
          if (params[1]) draft.options = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
          if (params[2]) draft.correct_option_id = params[2];
          if (params[3]) draft.explanation = params[3];
          draft.updated_at = new Date();
          this.persistToMongo('ai_draft_questions', draft.id, draft);
          rows.push({ ...draft });
        }
      } else if (q.startsWith('DELETE FROM ai_draft_questions WHERE id = $1')) {
        const draftId = params[0];
        const item = this.memAiDraftQuestions.get(draftId);
        if (item) {
          this.memAiDraftQuestions.delete(draftId);
          this.deleteFromMongo('ai_draft_questions', draftId);
          rows.push({ ...item });
        }
      } else if (q.startsWith('DELETE FROM ai_draft_questions WHERE question_bank_id = $1')) {
        const qbId = params[0];
        for (const [id, item] of Array.from(this.memAiDraftQuestions.entries())) {
          if (item.question_bank_id === qbId) {
            this.memAiDraftQuestions.delete(id);
            this.deleteFromMongo('ai_draft_questions', id);
            rows.push({ ...item });
          }
        }
      } else if (q.includes('WHERE question_bank_id = $1')) {
        const qbId = params[0];
        const drafts = Array.from(this.memAiDraftQuestions.values()).filter(
          (d) => d.question_bank_id === qbId,
        );
        rows.push(...drafts.map((d) => ({ ...d })));
      } else if (q.includes('WHERE id = $1')) {
        const draft = this.memAiDraftQuestions.get(params[0]);
        if (draft) rows.push({ ...draft });
      } else {
        rows.push(...Array.from(this.memAiDraftQuestions.values()).map((d) => ({ ...d })));
      }
    }

    // 10b. Questions
    else if (/\b(?:FROM|INTO|UPDATE|DELETE FROM)\s+questions\b/i.test(q)) {
      if (q.startsWith('INSERT INTO questions')) {
        const id = crypto.randomUUID();
        const question = {
          id,
          question_bank_id: params[0],
          text: params[1],
          options: typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2],
          correct_option_id: params[3],
          explanation: params[4] || null,
          source: params[5] || (q.includes("'ai_generated'") ? 'ai_generated' : 'manual'),
        };
        this.memQuestions.set(id, question);
        this.persistToMongo('questions', id, question);
        rows.push({ ...question });
      } else if (q.startsWith('DELETE FROM questions WHERE id = $1')) {
        const qId = params[0];
        const item = this.memQuestions.get(qId);
        if (item) {
          this.memQuestions.delete(qId);
          this.deleteFromMongo('questions', qId);
          rows.push({ ...item });
        }
      } else if (q.includes('WHERE question_bank_id = $1')) {
        const qbId = params[0];
        const qs = Array.from(this.memQuestions.values()).filter(
          (item) => item.question_bank_id === qbId,
        );
        rows.push(...qs);
      } else if (q.includes('WHERE id = $1')) {
        const item = this.memQuestions.get(params[0]);
        if (item) rows.push({ ...item });
      } else {
        rows.push(...Array.from(this.memQuestions.values()));
      }
    }

    // 10c. Question Banks
    else if (q.includes('question_banks')) {
      if (q.startsWith('INSERT INTO question_banks')) {
        const id = crypto.randomUUID();
        const qb = {
          id,
          course_id: params[0],
          subject_skill_id: params[1] || null,
          title: params[2],
          deadline: params[3] || null,
          pass_percentage: params[4] ?? 60,
          time_limit_minutes: params[5] ?? 30,
          source_pdf_url: params[6] || null,
          source_text: params[7] || null,
          created_at: new Date(),
        };
        this.memQuestionBanks.set(id, qb);
        this.persistToMongo('question_banks', id, qb);
        rows.push({ ...qb });
      } else if (q.startsWith('UPDATE question_banks')) {
        const id = params[params.length - 1];
        const qb = this.memQuestionBanks.get(id);
        if (qb) {
          if (params[0] != null) qb.title = params[0];
          if (params[1] != null) qb.deadline = params[1];
          if (params[2] != null) qb.pass_percentage = params[2];
          if (params[3] != null) qb.time_limit_minutes = params[3];
          if (params[4] != null) qb.subject_skill_id = params[4];
          this.persistToMongo('question_banks', qb.id, qb);
          rows.push({ ...qb });
        }
      } else if (q.includes('WHERE id = $1')) {
        const qb = this.memQuestionBanks.get(params[0]);
        if (qb) rows.push({ ...qb });
      } else if (q.includes('WHERE course_id = $1') || q.includes('WHERE qb.course_id = $1')) {
        const courseId = params[0];
        const qbs = Array.from(this.memQuestionBanks.values()).filter(
          (qb) => qb.course_id === courseId,
        ).map((qb) => {
          const qCount = Array.from(this.memQuestions.values()).filter(
            (q) => q.question_bank_id === qb.id,
          ).length;
          return {
            ...qb,
            question_count: qCount,
          };
        });
        rows.push(...qbs);
      } else {
        rows.push(...Array.from(this.memQuestionBanks.values()));
      }
    } else if (q.includes('FROM feedback') || q.startsWith('INSERT INTO feedback')) {
      if (q.startsWith('INSERT INTO feedback')) {
        const id = crypto.randomUUID();
        let courseId = params[0];
        let traineeId = params[1];
        let rating = 5;
        let comment: string | null = null;

        if (params.length >= 3) {
          rating = Number(params[2]);
          comment = params[3] || null;
        } else {
          const m = q.match(/VALUES\s*\([^,]+,\s*[^,]+,\s*(\d+)/i);
          if (m) rating = parseInt(m[1], 10);
        }

        const f = {
          id,
          course_id: courseId,
          trainee_id: traineeId,
          rating,
          comment,
          created_at: new Date(),
        };
        this.memFeedback.set(id, f);
        this.persistToMongo('feedback', id, f);
        rows.push(f);
      }
    }

    // 11. Audit Logs
    else if (q.startsWith('INSERT INTO audit_logs')) {
      const id = crypto.randomUUID();
      const log = { id, actor_id: params[0], action: params[1], target_id: params[2], metadata: params[3], created_at: new Date() };
      this.memAuditLogs.set(id, log);
      this.persistToMongo('audit_logs', id, log);
      rows.push(log);
    } else if (q.includes('FROM audit_logs')) {
      let logs = Array.from(this.memAuditLogs.values()).map((log) => {
        const actor = this.memUsers.get(log.actor_id);
        let meta = log.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch { meta = {}; }
        }
        return {
          ...log,
          metadata: meta,
          actor_name: actor ? actor.name : 'System Admin',
          actor_email: actor ? actor.email : 'admin@syllabiq.gov.in',
          actor_role: actor ? actor.role : 'admin',
        };
      });

      // Filter by action
      if (q.includes('al.action = $')) {
        const actionParam = params.find((p) => typeof p === 'string' && !p.includes('%') && !p.includes('T') && !p.includes(':'));
        if (actionParam) {
          logs = logs.filter((l) => l.action === actionParam);
        }
      }

      // Filter by actor
      if (q.includes('u.name ILIKE $') || q.includes('u.email ILIKE $')) {
        const actorParam = params.find((p) => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
        if (actorParam) {
          const clean = actorParam.replace(/%/g, '').toLowerCase();
          logs = logs.filter((l) => l.actor_name.toLowerCase().includes(clean) || l.actor_email.toLowerCase().includes(clean));
        }
      }

      logs = logs.reverse();
      rows.push(...logs);
    }

    // 12. Announcements
    else if (q.includes('FROM announcements') || q.startsWith('INSERT INTO announcements') || q.startsWith('UPDATE announcements') || q.startsWith('DELETE FROM announcements')) {
      if (q.includes('count(*)')) {
        rows.push({ count: this.memAnnouncements.size });
      } else if (q.startsWith('INSERT INTO announcements')) {
        const id = crypto.randomUUID();
        const ann = {
          id,
          title: params[0],
          body: params[1],
          type: params[2] || 'announcement',
          published_by: params[3],
          published_at: new Date(),
        };
        this.memAnnouncements.set(id, ann);
        this.persistToMongo('announcements', id, ann);
        rows.push(ann);
      } else if (q.startsWith('UPDATE announcements')) {
        const id = params[3] || params[params.length - 1];
        const ann = this.memAnnouncements.get(id);
        if (ann) {
          if (params[0]) ann.title = params[0];
          if (params[1]) ann.body = params[1];
          if (params[2]) ann.type = params[2];
          this.persistToMongo('announcements', ann.id, ann);
          rows.push({ ...ann });
        }
      } else if (q.startsWith('DELETE FROM announcements')) {
        const id = params[0];
        const ann = this.memAnnouncements.get(id);
        if (ann) {
          this.memAnnouncements.delete(id);
          this.deleteFromMongo('announcements', id);
          rows.push({ id });
        }
      } else if (q.includes('WHERE a.id = $1') || q.includes('WHERE id = $1')) {
        const id = params[0];
        const ann = this.memAnnouncements.get(id);
        if (ann) {
          const author = this.memUsers.get(ann.published_by);
          rows.push({
            ...ann,
            author_name: author ? author.name : 'Ministry Admin',
            author_email: author ? author.email : 'admin@syllabiq.gov.in',
            author_role: author ? author.role : 'admin',
          });
        }
      } else {
        let all = Array.from(this.memAnnouncements.values()).map((a) => {
          const author = this.memUsers.get(a.published_by);
          return {
            ...a,
            author_name: author ? author.name : 'Ministry Admin',
            author_email: author ? author.email : 'admin@syllabiq.gov.in',
            author_role: author ? author.role : 'admin',
          };
        });

        if (q.includes('a.type = $')) {
          const typeParam = params.find((p) => ['announcement', 'achievement', 'new_content'].includes(p));
          if (typeParam) {
            all = all.filter((a) => a.type === typeParam);
          }
        }

        if (q.includes('a.title ILIKE $') || q.includes('a.body ILIKE $')) {
          const searchParam = params.find((p) => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
          if (searchParam) {
            const clean = searchParam.replace(/%/g, '').toLowerCase();
            all = all.filter((a) => a.title.toLowerCase().includes(clean) || a.body.toLowerCase().includes(clean));
          }
        }

        all.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        rows.push(...all);
      }
    }

    // 13. Dashboard Aggregates Fallback Queries
    else if (q.includes('COUNT(*)::int as total_enrollments') || q.includes('DATE_TRUNC(\'day\', e.enrolled_at)')) {
      const from = params[0] ? new Date(params[0]) : null;
      const to = params[1] ? new Date(params[1]) : null;

      let enrollmentsList = Array.from(this.memEnrollments.values());
      if (from) enrollmentsList = enrollmentsList.filter((e) => new Date(e.enrolled_at) >= from);
      if (to) enrollmentsList = enrollmentsList.filter((e) => new Date(e.enrolled_at) <= to);

      if (q.includes('COUNT(*)::int as total_enrollments')) {
        const total = enrollmentsList.length;
        const active = enrollmentsList.filter((e) => e.status === 'active').length;
        const completed = enrollmentsList.filter((e) => e.status === 'completed').length;
        const dropped = enrollmentsList.filter((e) => e.status === 'dropped').length;
        const avgProg = total > 0 ? enrollmentsList.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / total : 0;
        rows.push({
          total_enrollments: total,
          active_enrollments: active,
          completed_enrollments: completed,
          dropped_enrollments: dropped,
          avg_progress_percent: avgProg,
        });
      } else if (q.includes('DATE_TRUNC(\'day\', e.enrolled_at)')) {
        const map = new Map<string, number>();
        for (const e of enrollmentsList) {
          const key = new Date(e.enrolled_at).toISOString().split('T')[0];
          map.set(key, (map.get(key) || 0) + 1);
        }
        for (const [bucket, count] of Array.from(map.entries()).sort()) {
          rows.push({ bucket, count });
        }
      }
    } else if (q.includes('COUNT(*)::int as total_certificates_issued') || q.includes('DATE_TRUNC(\'day\', cert.created_at)')) {
      const from = params[0] ? new Date(params[0]) : null;
      const to = params[1] ? new Date(params[1]) : null;

      let certList = Array.from(this.memCertificates.values());
      if (from) certList = certList.filter((c) => new Date(c.created_at) >= from);
      if (to) certList = certList.filter((c) => new Date(c.created_at) <= to);

      if (q.includes('COUNT(*)::int as total_certificates_issued')) {
        const total = certList.length;
        const uniqueUsers = new Set(certList.map((c) => c.user_id)).size;
        const distinctCourses = new Set(certList.filter((c) => c.course_id).map((c) => c.course_id)).size;
        rows.push({
          total_certificates_issued: total,
          unique_certified_trainees: uniqueUsers,
          certified_courses_count: distinctCourses,
        });
      } else if (q.includes('DATE_TRUNC(\'day\', cert.created_at)')) {
        const map = new Map<string, number>();
        for (const c of certList) {
          const key = new Date(c.created_at).toISOString().split('T')[0];
          map.set(key, (map.get(key) || 0) + 1);
        }
        for (const [bucket, count] of Array.from(map.entries()).sort()) {
          rows.push({ bucket, count });
        }
      }
    } else if (q.includes('COUNT(*)::int as total_attempts') && q.includes('overall_pass_rate')) {
      const from = params[0] ? new Date(params[0]) : null;
      const to = params[1] ? new Date(params[1]) : null;

      let attList = Array.from(this.memAssessmentAttempts.values()).filter((a) => a.submitted_at !== null);
      if (from) attList = attList.filter((a) => new Date(a.submitted_at) >= from);
      if (to) attList = attList.filter((a) => new Date(a.submitted_at) <= to);

      const total = attList.length;
      const passed = attList.filter((a) => a.passed === true).length;
      const failed = attList.filter((a) => a.passed === false).length;
      const avgScore = total > 0 ? attList.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / total : 0;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      rows.push({
        total_attempts: total,
        passed_attempts: passed,
        failed_attempts: failed,
        avg_score: avgScore,
        overall_pass_rate: passRate,
      });
    } else if (q.includes('COUNT(*)::int as total_users') && q.includes('active_user_count')) {
      const usersList = Array.from(this.memUsers.values());
      const total = usersList.length;
      const trainees = usersList.filter((u) => u.role === 'trainee').length;
      const trainers = usersList.filter((u) => u.role === 'trainer').length;
      const admins = usersList.filter((u) => u.role === 'admin').length;
      const pending = usersList.filter((u) => u.status === 'pending').length;
      const approved = usersList.filter((u) => u.status === 'approved').length;
      const activeCount = approved;

      rows.push({
        total_users: total,
        trainee_count: trainees,
        trainer_count: trainers,
        admin_count: admins,
        pending_approval_count: pending,
        approved_count: approved,
        active_user_count: activeCount,
      });
    } else if (q.includes('s.category') && q.includes('total_tagged')) {
      const catMap = new Map<string, { beginner: number; intermediate: number; advanced: number; expert: number; total: number }>();
      for (const skill of this.memSkills.values()) {
        const cat = skill.category || 'General';
        if (!catMap.has(cat)) {
          catMap.set(cat, { beginner: 0, intermediate: 0, advanced: 0, expert: 0, total: 0 });
        }
      }
      for (const us of this.memUserSkills.values()) {
        const skill = this.memSkills.get(us.skill_id);
        const cat = skill?.category || 'General';
        const entry = catMap.get(cat) || { beginner: 0, intermediate: 0, advanced: 0, expert: 0, total: 0 };
        const lvl = (us.proficiency_level || 'beginner').toLowerCase();
        if (lvl === 'beginner') entry.beginner++;
        else if (lvl === 'intermediate') entry.intermediate++;
        else if (lvl === 'advanced') entry.advanced++;
        else if (lvl === 'expert') entry.expert++;
        entry.total++;
        catMap.set(cat, entry);
      }
      for (const [cat, data] of catMap.entries()) {
        rows.push({
          category: cat,
          beginner: data.beginner,
          intermediate: data.intermediate,
          advanced: data.advanced,
          expert: data.expert,
          total_tagged: data.total,
        });
      }
    }

    return {
      rows,
      command: 'SELECT',
      rowCount: rows.length,
      oid: 0,
      fields: [],
    } as QueryResult<T>;
  }


  public getMongoDb(): Db | null {
    return this.mongoDb;
  }

  public getMongoClient(): MongoClient | null {
    return this.mongoClient;
  }

  public isMongo(): boolean {
    return this.isMongoConnected;
  }

  public getMongoCollection<T extends Document = any>(name: string): Collection<T> | null {
    if (!this.isMongoConnected || !this.mongoDb) return null;
    return this.mongoDb.collection<T>(name);
  }

  private persistToMongo(collectionName: string, id: string, doc: any): void {
    if (!this.isMongoConnected || !this.mongoDb) return;
    const cleanDoc = { ...doc };
    delete cleanDoc._id;
    this.mongoDb
      .collection(collectionName)
      .replaceOne({ _id: id as any }, { _id: id as any, ...cleanDoc }, { upsert: true })
      .catch((err) => {
        this.logger.warn(`Failed to persist to MongoDB [${collectionName}:${id}]: ${err.message}`);
      });
  }

  private deleteFromMongo(collectionName: string, id: string): void {
    if (!this.isMongoConnected || !this.mongoDb) return;
    this.mongoDb
      .collection(collectionName)
      .deleteOne({ _id: id as any })
      .catch((err) => {
        this.logger.warn(`Failed to delete from MongoDB [${collectionName}:${id}]: ${err.message}`);
      });
  }

  private async loadAllCollectionsFromMongo(): Promise<void> {
    if (!this.isMongoConnected || !this.mongoDb) return;
    try {
      const db = this.mongoDb;

      // 1. Users
      const users = await db.collection('users').find().toArray();
      for (const u of users) {
        const id = (u._id?.toString() || u.id) as string;
        this.memUsers.set(id, { ...u, id });
      }

      // 2. Trainee Profiles
      const traineeProfiles = await db.collection('trainee_profiles').find().toArray();
      for (const p of traineeProfiles) {
        const id = (p.user_id || p._id?.toString()) as string;
        this.memTraineeProfiles.set(id, { ...p, user_id: id });
      }

      // 3. Trainer Profiles
      const trainerProfiles = await db.collection('trainer_profiles').find().toArray();
      for (const p of trainerProfiles) {
        const id = (p.user_id || p._id?.toString()) as string;
        this.memTrainerProfiles.set(id, { ...p, user_id: id });
      }

      // 4. Skills
      const skills = await db.collection('skills').find().toArray();
      for (const s of skills) {
        const id = (s._id?.toString() || s.id) as string;
        this.memSkills.set(id, { ...s, id });
      }

      // 5. User Skills
      const userSkills = await db.collection('user_skills').find().toArray();
      for (const us of userSkills) {
        const key = `${us.user_id}_${us.skill_id}`;
        this.memUserSkills.set(key, { ...us, id: (us._id?.toString() || us.id) as string });
      }

      // 6. Certificates
      const certificates = await db.collection('certificates').find().toArray();
      for (const c of certificates) {
        const id = (c._id?.toString() || c.id) as string;
        this.memCertificates.set(id, { ...c, id });
      }

      // 7. Badges
      const badges = await db.collection('badges').find().toArray();
      for (const b of badges) {
        this.memBadges.set(b.code, { ...b, id: (b._id?.toString() || b.id) as string });
      }

      // 8. User Badges
      const userBadges = await db.collection('user_badges').find().toArray();
      for (const ub of userBadges) {
        const key = `${ub.user_id}_${ub.badge_id}`;
        this.memUserBadges.set(key, { ...ub, id: (ub._id?.toString() || ub.id) as string });
      }

      // 9. Courses
      const courses = await db.collection('courses').find().toArray();
      for (const c of courses) {
        const id = (c._id?.toString() || c.id) as string;
        this.memCourses.set(id, { ...c, id });
      }

      // 10. Course Resources
      const resources = await db.collection('course_resources').find().toArray();
      for (const r of resources) {
        const id = (r._id?.toString() || r.id) as string;
        this.memCourseResources.set(id, { ...r, id });
      }

      // 11. Enrollments
      const enrollments = await db.collection('enrollments').find().toArray();
      for (const e of enrollments) {
        const id = (e._id?.toString() || e.id) as string;
        this.memEnrollments.set(id, { ...e, id });
      }

      // 12. Feedback
      const feedback = await db.collection('feedback').find().toArray();
      for (const f of feedback) {
        const id = (f._id?.toString() || f.id) as string;
        this.memFeedback.set(id, { ...f, id });
      }

      // 13. Audit Logs
      const logs = await db.collection('audit_logs').find().toArray();
      for (const l of logs) {
        const id = (l._id?.toString() || l.id) as string;
        this.memAuditLogs.set(id, { ...l, id });
      }

      // 14. Announcements
      const announcements = await db.collection('announcements').find().toArray();
      for (const a of announcements) {
        const id = (a._id?.toString() || a.id) as string;
        this.memAnnouncements.set(id, { ...a, id });
      }

      // 15. Question Banks
      const questionBanks = await db.collection('question_banks').find().toArray();
      for (const qb of questionBanks) {
        const id = (qb._id?.toString() || qb.id) as string;
        this.memQuestionBanks.set(id, { ...qb, id });
      }

      // 16. Questions
      const questions = await db.collection('questions').find().toArray();
      for (const q of questions) {
        const id = (q._id?.toString() || q.id) as string;
        this.memQuestions.set(id, { ...q, id });
      }

      // 17. AI Draft Questions
      const drafts = await db.collection('ai_draft_questions').find().toArray();
      for (const d of drafts) {
        const id = (d._id?.toString() || d.id) as string;
        this.memAiDraftQuestions.set(id, { ...d, id });
      }

      // 18. Assessment Attempts
      const attempts = await db.collection('assessment_attempts').find().toArray();
      for (const at of attempts) {
        const id = (at._id?.toString() || at.id) as string;
        this.memAssessmentAttempts.set(id, { ...at, id });
      }

      this.logger.log(
        `🍃 Hydrated in-memory store from MongoDB Atlas: ${users.length} users, ${courses.length} courses, ${skills.length} skills, ${questionBanks.length} question banks`,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to hydrate store from MongoDB: ${err?.message}`);
    }
  }

  async runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (this.isConnected) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await this.query(sql);
      }
    }
  }
}
