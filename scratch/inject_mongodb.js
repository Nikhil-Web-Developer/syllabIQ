const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'backend', 'src', 'database', 'database.service.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add MongoDB import
if (!content.includes("import { MongoClient, Db, Collection, Document } from 'mongodb';")) {
  content = content.replace(
    "import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';",
    "import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';\nimport { MongoClient, Db, Collection, Document } from 'mongodb';"
  );
}

// 2. Add Mongo state variables in class
if (!content.includes('private mongoClient: MongoClient | null = null;')) {
  content = content.replace(
    'private isConnected = false;',
    `private isConnected = false;
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isMongoConnected = false;`
  );
}

// 3. Update onModuleInit to connect to MongoDB
const oldInit = `  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to PostgreSQL database');
      client.release();
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        \`PostgreSQL not reachable at configured host: \${(error as Error).message}. Running with resilient in-memory database store.\`,
      );
    }
  }`;

const newInit = `  async onModuleInit() {
    // 1. Connect to MongoDB Atlas
    const mongoUri =
      this.configService.get<string>('MONGODB_URI') || process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        this.mongoClient = new MongoClient(mongoUri, {
          serverSelectionTimeoutMS: 8000,
          connectTimeoutMS: 10000,
        });
        await this.mongoClient.connect();
        const dbName =
          this.configService.get<string>('MONGODB_DB_NAME') || 'syllabiq';
        this.mongoDb = this.mongoClient.db(dbName);
        await this.mongoDb.command({ ping: 1 });
        this.isMongoConnected = true;
        this.logger.log(\`🍃 Successfully connected to MongoDB Atlas database (\${dbName})\`);
        await this.loadAllCollectionsFromMongo();
      } catch (mongoErr: any) {
        this.isMongoConnected = false;
        this.logger.warn(\`MongoDB connection failed: \${mongoErr?.message}\`);
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
        \`PostgreSQL not reachable at configured host: \${(error as Error).message}. Running with \${this.isMongoConnected ? 'MongoDB cloud persistence' : 'resilient in-memory database store'}.\`,
      );
    }
  }`;

content = content.replace(oldInit, newInit);

// 4. Update onModuleDestroy
const oldDestroy = `  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end().catch(() => {});
    }
  }`;

const newDestroy = `  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end().catch(() => {});
    }
    if (this.mongoClient) {
      await this.mongoClient.close().catch(() => {});
    }
  }`;

content = content.replace(oldDestroy, newDestroy);

// 5. Add Mongo persistence and hydration helper methods before runMigrations
const helperMethods = `
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
        this.logger.warn(\`Failed to persist to MongoDB [\${collectionName}:\${id}]: \${err.message}\`);
      });
  }

  private deleteFromMongo(collectionName: string, id: string): void {
    if (!this.isMongoConnected || !this.mongoDb) return;
    this.mongoDb
      .collection(collectionName)
      .deleteOne({ _id: id as any })
      .catch((err) => {
        this.logger.warn(\`Failed to delete from MongoDB [\${collectionName}:\${id}]: \${err.message}\`);
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
        const key = \`\${us.user_id}_\${us.skill_id}\`;
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
        const key = \`\${ub.user_id}_\${ub.badge_id}\`;
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
        \`🍃 Hydrated in-memory store from MongoDB Atlas: \${users.length} users, \${courses.length} courses, \${skills.length} skills, \${questionBanks.length} question banks\`,
      );
    } catch (err: any) {
      this.logger.warn(\`Failed to hydrate store from MongoDB: \${err?.message}\`);
    }
  }
`;

if (!content.includes('public getMongoDb(): Db | null')) {
  content = content.replace('  async runMigrations(): Promise<void> {', helperMethods + '\n  async runMigrations(): Promise<void> {');
}

// 6. In handleInMemoryQuery, add persistToMongo calls
// Users insert
content = content.replace(
  'this.memUsers.set(id, user);\n        rows.push({ ...user });',
  'this.memUsers.set(id, user);\n        this.persistToMongo(\'users\', id, user);\n        rows.push({ ...user });'
);
// Users update name
content = content.replace(
  'user.name = params[0];\n            user.updated_at = new Date();\n            rows.push({ ...user });',
  'user.name = params[0];\n            user.updated_at = new Date();\n            this.persistToMongo(\'users\', user.id, user);\n            rows.push({ ...user });'
);
// Users update status
content = content.replace(
  'user.status = q.includes(\'approved\') ? \'approved\' : \'rejected\';\n            user.updated_at = new Date();\n            rows.push({ ...user });',
  'user.status = q.includes(\'approved\') ? \'approved\' : \'rejected\';\n            user.updated_at = new Date();\n            this.persistToMongo(\'users\', user.id, user);\n            rows.push({ ...user });'
);
// Users update role
content = content.replace(
  'user.role = params[0];\n            user.updated_at = new Date();\n            rows.push({ ...user });',
  'user.role = params[0];\n            user.updated_at = new Date();\n            this.persistToMongo(\'users\', user.id, user);\n            rows.push({ ...user });'
);
// Users update password_reset_token
content = content.replace(
  'user.password_reset_token = params[0];\n            user.password_reset_expires = params[1];\n            user.updated_at = new Date();\n            rows.push({ ...user });',
  'user.password_reset_token = params[0];\n            user.password_reset_expires = params[1];\n            user.updated_at = new Date();\n            this.persistToMongo(\'users\', user.id, user);\n            rows.push({ ...user });'
);
// Users update password_hash
content = content.replace(
  'user.password_hash = params[0];\n            user.password_reset_token = null;\n            user.password_reset_expires = null;\n            user.updated_at = new Date();\n            rows.push({ ...user });',
  'user.password_hash = params[0];\n            user.password_reset_token = null;\n            user.password_reset_expires = null;\n            user.updated_at = new Date();\n            this.persistToMongo(\'users\', user.id, user);\n            rows.push({ ...user });'
);
// Users update is_email_verified
content = content.replace(
  'user.is_email_verified = true;\n            user.email_verification_token = null;\n            rows.push({ ...user });',
  'user.is_email_verified = true;\n            user.email_verification_token = null;\n            this.persistToMongo(\'users\', user.id, user);\n            rows.push({ ...user });'
);

// Skills insert
content = content.replace(
  'this.memSkills.set(id, s);\n          rows.push(s);',
  'this.memSkills.set(id, s);\n          this.persistToMongo(\'skills\', id, s);\n          rows.push(s);'
);

// User skills insert
content = content.replace(
  'this.memUserSkills.set(key, item);\n        }\n        rows.push({ ...item });',
  'this.memUserSkills.set(key, item);\n        }\n        this.persistToMongo(\'user_skills\', item.id, item);\n        rows.push({ ...item });'
);
// User skills delete
content = content.replace(
  'this.memUserSkills.delete(key);\n          rows.push({ id: item.id });',
  'this.memUserSkills.delete(key);\n          this.deleteFromMongo(\'user_skills\', item.id);\n          rows.push({ id: item.id });'
);

// Trainee profiles insert/update
content = content.replace(
  'this.memTraineeProfiles.set(userId, p);\n        }\n        rows.push({ ...p });',
  'this.memTraineeProfiles.set(userId, p);\n        }\n        this.persistToMongo(\'trainee_profiles\', userId, p);\n        rows.push({ ...p });'
);

// Trainer profiles insert/update
content = content.replace(
  'this.memTrainerProfiles.set(userId, p);\n        }\n        rows.push({ ...p });\n      } else if (q.startsWith(\'UPDATE trainer_profiles\'))',
  'this.memTrainerProfiles.set(userId, p);\n        }\n        this.persistToMongo(\'trainer_profiles\', userId, p);\n        rows.push({ ...p });\n      } else if (q.startsWith(\'UPDATE trainer_profiles\'))'
);
content = content.replace(
  'this.memTrainerProfiles.set(userId, p);\n        }\n        rows.push({ ...p });\n      } else if (q.includes(\'WHERE user_id = $1\'))',
  'this.memTrainerProfiles.set(userId, p);\n        }\n        this.persistToMongo(\'trainer_profiles\', userId, p);\n        rows.push({ ...p });\n      } else if (q.includes(\'WHERE user_id = $1\'))'
);

// Certificates insert
content = content.replace(
  'this.memCertificates.set(id, cert);\n        rows.push({ ...cert });',
  'this.memCertificates.set(id, cert);\n        this.persistToMongo(\'certificates\', id, cert);\n        rows.push({ ...cert });'
);

// Badges insert
content = content.replace(
  'this.memBadges.set(b.code, b);\n        rows.push(b);',
  'this.memBadges.set(b.code, b);\n        this.persistToMongo(\'badges\', b.code, b);\n        rows.push(b);'
);

// User badges insert
content = content.replace(
  'this.memUserBadges.set(key, ub);\n        }\n        rows.push({ ...ub });',
  'this.memUserBadges.set(key, ub);\n        }\n        this.persistToMongo(\'user_badges\', ub.id, ub);\n        rows.push({ ...ub });'
);

// Courses insert
content = content.replace(
  'this.memCourses.set(id, course);\n        rows.push({ ...course });',
  'this.memCourses.set(id, course);\n        this.persistToMongo(\'courses\', id, course);\n        rows.push({ ...course });'
);
// Courses update trainer
content = content.replace(
  'course.trainer_id = trainerId;\n            course.updated_at = new Date();\n            rows.push({ ...course });',
  'course.trainer_id = trainerId;\n            course.updated_at = new Date();\n            this.persistToMongo(\'courses\', course.id, course);\n            rows.push({ ...course });'
);
// Courses update details
content = content.replace(
  'course.status = params[4];\n            course.updated_at = new Date();\n            rows.push({ ...course });',
  'course.status = params[4];\n            course.updated_at = new Date();\n            this.persistToMongo(\'courses\', course.id, course);\n            rows.push({ ...course });'
);
// Courses archive
content = content.replace(
  'course.status = \'archived\';\n            course.updated_at = new Date();\n            rows.push({ ...course });',
  'course.status = \'archived\';\n            course.updated_at = new Date();\n            this.persistToMongo(\'courses\', course.id, course);\n            rows.push({ ...course });'
);
// Courses delete
content = content.replace(
  'this.memCourses.delete(courseId);\n        rows.push({ id: courseId });',
  'this.memCourses.delete(courseId);\n        this.deleteFromMongo(\'courses\', courseId);\n        rows.push({ id: courseId });'
);

// Course resources insert
content = content.replace(
  'this.memCourseResources.set(id, res);\n        rows.push({ ...res });',
  'this.memCourseResources.set(id, res);\n        this.persistToMongo(\'course_resources\', id, res);\n        rows.push({ ...res });'
);
// Course resources delete
content = content.replace(
  'this.memCourseResources.delete(resourceId);\n          rows.push({ id: resourceId });',
  'this.memCourseResources.delete(resourceId);\n          this.deleteFromMongo(\'course_resources\', resourceId);\n          rows.push({ id: resourceId });'
);

// Enrollments insert
content = content.replace(
  'this.memEnrollments.set(id, enroll);\n        rows.push({ ...enroll });',
  'this.memEnrollments.set(id, enroll);\n        this.persistToMongo(\'enrollments\', id, enroll);\n        rows.push({ ...enroll });'
);
// Enrollments update progress
content = content.replace(
  'enroll.progress_percent = params[0];\n            enroll.status = params[1];\n            rows.push({ ...enroll });',
  'enroll.progress_percent = params[0];\n            enroll.status = params[1];\n            this.persistToMongo(\'enrollments\', enroll.id, enroll);\n            rows.push({ ...enroll });'
);
// Enrollments update status
content = content.replace(
  'enroll.status = params[0];\n            rows.push({ ...enroll });',
  'enroll.status = params[0];\n            this.persistToMongo(\'enrollments\', enroll.id, enroll);\n            rows.push({ ...enroll });'
);

// Assessment attempts insert
content = content.replace(
  'this.memAssessmentAttempts.set(id, attempt);\n        rows.push({ ...attempt });',
  'this.memAssessmentAttempts.set(id, attempt);\n        this.persistToMongo(\'assessment_attempts\', id, attempt);\n        rows.push({ ...attempt });'
);
// Assessment attempts update
content = content.replace(
  'attempt.answers = typeof params[2] === \'string\' ? JSON.parse(params[2]) : params[2];\n          rows.push({ ...attempt });',
  'attempt.answers = typeof params[2] === \'string\' ? JSON.parse(params[2]) : params[2];\n          this.persistToMongo(\'assessment_attempts\', attempt.id, attempt);\n          rows.push({ ...attempt });'
);

// AI draft questions insert
content = content.replace(
  'this.memAiDraftQuestions.set(id, draft);\n        rows.push({ ...draft });',
  'this.memAiDraftQuestions.set(id, draft);\n        this.persistToMongo(\'ai_draft_questions\', id, draft);\n        rows.push({ ...draft });'
);
// AI draft questions update
content = content.replace(
  'draft.updated_at = new Date();\n          rows.push({ ...draft });',
  'draft.updated_at = new Date();\n          this.persistToMongo(\'ai_draft_questions\', draft.id, draft);\n          rows.push({ ...draft });'
);
// AI draft questions delete single
content = content.replace(
  'this.memAiDraftQuestions.delete(draftId);\n          rows.push({ ...item });',
  'this.memAiDraftQuestions.delete(draftId);\n          this.deleteFromMongo(\'ai_draft_questions\', draftId);\n          rows.push({ ...item });'
);
// AI draft questions delete all by question_bank_id
content = content.replace(
  'this.memAiDraftQuestions.delete(id);\n            rows.push({ ...item });',
  'this.memAiDraftQuestions.delete(id);\n            this.deleteFromMongo(\'ai_draft_questions\', id);\n            rows.push({ ...item });'
);

// Questions insert
content = content.replace(
  'this.memQuestions.set(id, question);\n        rows.push({ ...question });',
  'this.memQuestions.set(id, question);\n        this.persistToMongo(\'questions\', id, question);\n        rows.push({ ...question });'
);
// Questions delete
content = content.replace(
  'this.memQuestions.delete(qId);\n          rows.push({ ...item });',
  'this.memQuestions.delete(qId);\n          this.deleteFromMongo(\'questions\', qId);\n          rows.push({ ...item });'
);

// Question banks insert
content = content.replace(
  'this.memQuestionBanks.set(id, qb);\n        rows.push({ ...qb });',
  'this.memQuestionBanks.set(id, qb);\n        this.persistToMongo(\'question_banks\', id, qb);\n        rows.push({ ...qb });'
);
// Question banks update
content = content.replace(
  'if (params[4] !== undefined) qb.subject_skill_id = params[4];\n          rows.push({ ...qb });',
  'if (params[4] !== undefined) qb.subject_skill_id = params[4];\n          this.persistToMongo(\'question_banks\', qb.id, qb);\n          rows.push({ ...qb });'
);

// Feedback insert
content = content.replace(
  'this.memFeedback.set(id, f);\n        rows.push(f);',
  'this.memFeedback.set(id, f);\n        this.persistToMongo(\'feedback\', id, f);\n        rows.push(f);'
);

// Audit logs insert
content = content.replace(
  'this.memAuditLogs.set(id, log);\n      rows.push(log);',
  'this.memAuditLogs.set(id, log);\n      this.persistToMongo(\'audit_logs\', id, log);\n      rows.push(log);'
);

// Announcements insert
content = content.replace(
  'this.memAnnouncements.set(id, ann);\n        rows.push(ann);',
  'this.memAnnouncements.set(id, ann);\n        this.persistToMongo(\'announcements\', id, ann);\n        rows.push(ann);'
);
// Announcements update
content = content.replace(
  'if (params[2]) ann.type = params[2];\n          rows.push({ ...ann });',
  'if (params[2]) ann.type = params[2];\n          this.persistToMongo(\'announcements\', ann.id, ann);\n          rows.push({ ...ann });'
);
// Announcements delete
content = content.replace(
  'this.memAnnouncements.delete(id);\n          rows.push({ id });',
  'this.memAnnouncements.delete(id);\n          this.deleteFromMongo(\'announcements\', id);\n          rows.push({ id });'
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully injected MongoDB into database.service.ts!');
