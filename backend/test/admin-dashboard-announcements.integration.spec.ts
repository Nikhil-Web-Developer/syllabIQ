import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Admin Dashboard, Announcements & Audit Logs (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let trainerToken: string;
  let traineeToken: string;

  let trainerId: string;
  let traineeId: string;
  let skillId: string;
  let courseId: string;
  let questionBankId: string;
  let announcementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    // 1. Log in Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@syllabiq.gov.in',
        password: 'Admin@SyllabIQ2026',
      });
    adminToken = adminLoginRes.body.tokens?.accessToken || adminLoginRes.body.access_token;

    // 2. Sign up Trainer
    const trainerSignup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Suresh Kumar',
        email: `suresh.trainer.${Date.now()}@moes.gov.in`,
        password: 'TrainerPassword@123',
        role: 'trainer',
        bio: 'Atmospheric Sciences Senior Scientist',
        yearsExperience: 8,
      });
    trainerId = trainerSignup.body.user?.id || trainerSignup.body.id;

    // 3. Sign up Trainee
    const traineeSignup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Amit Patel',
        email: `amit.trainee.${Date.now()}@moes.gov.in`,
        password: 'TraineePassword@123',
        role: 'trainee',
        bio: 'Meteorological Trainee',
      });
    traineeId = traineeSignup.body.user?.id || traineeSignup.body.id;

    // 4. Approve Trainer and Trainee as Admin
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${trainerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${traineeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Log in approved Trainer
    const trainerLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: trainerSignup.body.user?.email,
        password: 'TrainerPassword@123',
      });
    trainerToken = trainerLoginRes.body.tokens?.accessToken || trainerLoginRes.body.access_token;

    // Log in approved Trainee
    const traineeLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: traineeSignup.body.user?.email,
        password: 'TraineePassword@123',
      });
    traineeToken = traineeLoginRes.body.tokens?.accessToken || traineeLoginRes.body.access_token;

    // 5. Get a skill
    const skillsRes = await request(app.getHttpServer()).get('/api/skills');
    const skillsList = Array.isArray(skillsRes.body) ? skillsRes.body : skillsRes.body.data || [];
    skillId = skillsList[0]?.id;

    // Tag trainee and trainer skills
    if (skillId) {
      await request(app.getHttpServer())
        .post('/api/users/me/skills')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({ skill_id: skillId, proficiency_level: 'intermediate', source: 'self_declared' });

      await request(app.getHttpServer())
        .post('/api/users/me/skills')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({ skill_id: skillId, proficiency_level: 'expert', source: 'certified' });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Announcements CRUD & Public Feed', () => {
    it('POST /api/admin/announcements - should publish an announcement as Admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'MoES National Monsoon Conclave 2026',
          body: 'Annual gathering of weather modelers and researchers scheduled for next month.',
          type: 'announcement',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('MoES National Monsoon Conclave 2026');
      expect(res.body.type).toBe('announcement');
      announcementId = res.body.id;
    });

    it('GET /api/announcements - should return public announcement feed', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/announcements')
        .expect(200);

      const items = Array.isArray(res.body) ? res.body : res.body.data || [];
      expect(items.length).toBeGreaterThan(0);
      const found = items.find((a: any) => a.id === announcementId);
      expect(found).toBeDefined();
      expect(found.author_name).toBeDefined();
    });

    it('GET /api/announcements?type=announcement - should filter by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/announcements?type=announcement')
        .expect(200);

      const items = Array.isArray(res.body) ? res.body : res.body.data || [];
      for (const item of items) {
        expect(item.type).toBe('announcement');
      }
    });

    it('PATCH /api/admin/announcements/:id - should update announcement title/body', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'MoES National Monsoon Conclave 2026 (Updated Dates)',
        })
        .expect(200);

      expect(res.body.title).toBe('MoES National Monsoon Conclave 2026 (Updated Dates)');
    });

    it('DELETE /api/admin/announcements/:id - should delete announcement', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/announcements/${announcementId}`)
        .expect(404);
    });
  });

  describe('2. Course Publishing Auto-Announcement & Audit Log Hook', () => {
    it('should create a draft course and question bank, then publish to auto-generate announcement', async () => {
      // 1. Create course as trainer
      const courseRes = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          title: 'Doppler Radar Principles & Data Assimilation',
          description: 'Comprehensive training in modern S-band radar interpretation.',
          subjectSkillId: skillId,
          difficulty: 'intermediate',
          status: 'draft',
        })
        .expect(201);

      courseId = courseRes.body.id;
      expect(courseId).toBeDefined();

      // 2. Attach question bank
      const qbRes = await request(app.getHttpServer())
        .post('/api/question-banks')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          courseId: courseId,
          subjectSkillId: skillId,
          title: 'Radar Fundamentals Quiz',
          passPercentage: 60,
          timeLimitMinutes: 20,
        })
        .expect(201);
      questionBankId = qbRes.body.id;

      // Add a question
      const qRes = await request(app.getHttpServer())
        .post(`/api/question-banks/${questionBankId}/questions`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          text: 'What is the primary frequency range of S-band weather radar?',
          options: [
            { id: 'opt_1', text: '2–4 GHz' },
            { id: 'opt_2', text: '8–12 GHz' },
          ],
          correctOptionId: 'opt_1',
          explanation: 'S-band operates between 2 and 4 GHz.',
        })
        .expect(201);
      const questionId = qRes.body.id;

      // 3. Publish course
      const publishRes = await request(app.getHttpServer())
        .patch(`/api/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(publishRes.body.status).toBe('published');

      // 4. Verify auto-generated "new_content" announcement appeared on public feed
      const feedRes = await request(app.getHttpServer())
        .get('/api/announcements?type=new_content')
        .expect(200);

      const items = Array.isArray(feedRes.body) ? feedRes.body : feedRes.body.data || [];
      const autoAnn = items.find((a: any) => a.title.includes('Doppler Radar Principles'));
      expect(autoAnn).toBeDefined();
      expect(autoAnn.type).toBe('new_content');
    });

    it('trainee enrolls, takes assessment, and updates progress', async () => {
      // Enroll
      await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(201);

      // Start attempt
      const attemptRes = await request(app.getHttpServer())
        .post('/api/attempts/start')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({ questionBankId: questionBankId })
        .expect(201);

      const attemptId = attemptRes.body.attempt?.id || attemptRes.body.id;
      expect(attemptId).toBeDefined();

      // Submit attempt
      const submitRes = await request(app.getHttpServer())
        .post(`/api/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({
          answers: {
            'q-1': 'opt_1',
          },
        })
        .expect((res: any) => expect([200, 201]).toContain(res.status));

      expect(submitRes.body.passed).toBeDefined();

      // Issue certificate
      await request(app.getHttpServer())
        .post('/api/users/me/certificates')
        .set('Authorization', `Bearer ${traineeToken}`)
        .attach('file', Buffer.from('%PDF-1.4 mock certificate content'), 'certificate.pdf')
        .field('title', 'Certificate of Mastery in Doppler Radar')
        .field('issuing_body', 'Ministry of Earth Sciences')
        .field('issue_date', '2026-08-27')
        .field('course_id', courseId)
        .expect(201);
    });
  });

  describe('3. Admin Dashboard Aggregates', () => {
    it('GET /api/admin/dashboard/enrollments - should return enrollment metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total_enrollments).toBeDefined();
      expect(typeof res.body.total_enrollments).toBe('number');
      expect(res.body.total_enrollments).toBeGreaterThanOrEqual(1);
      expect(res.body.breakdown).toBeDefined();
      expect(res.body.breakdown.active !== undefined || res.body.breakdown.completed !== undefined).toBe(true);
      expect(Array.isArray(res.body.enrollments_over_time || res.body.trend)).toBe(true);
    });

    it('GET /api/admin/dashboard/certifications - should return certification metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard/certifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total_certificates !== undefined || res.body.summary?.total_certificates_issued !== undefined).toBe(true);
      const totalCerts = res.body.total_certificates ?? res.body.summary?.total_certificates_issued;
      expect(totalCerts).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.top_courses || res.body.byCourse)).toBe(true);
    });

    it('GET /api/admin/dashboard/assessments - should return assessment metrics & skill averages', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard/assessments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total_attempts !== undefined || res.body.summary?.total_attempts !== undefined).toBe(true);
      expect(res.body.overall_pass_rate !== undefined || res.body.summary?.overall_pass_rate !== undefined).toBe(true);
      expect(Array.isArray(res.body.by_course || res.body.byQuestionBank)).toBe(true);
    });

    it('GET /api/admin/dashboard/participation - should return active counts and skill-gap heatmap', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard/participation')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total_users !== undefined || res.body.userCounts?.total_users !== undefined).toBe(true);
      expect(res.body.active_user_count !== undefined || res.body.userCounts?.active_approved !== undefined).toBe(true);
      expect(Array.isArray(res.body.skill_gap_heatmap)).toBe(true);
      expect(res.body.skill_gap_heatmap.length).toBeGreaterThan(0);
    });

    it('Date range query filter (?from=2099-01-01) should filter out historical items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard/enrollments?from=2099-01-01T00:00:00.000Z')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total_enrollments).toBe(0);
    });
  });

  describe('4. Audit Log Endpoint & Action Tracking', () => {
    it('GET /api/admin/audit-logs - should list recent audit trail entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const logs = Array.isArray(res.body) ? res.body : res.body.data || [];
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const actions = logs.map((l: any) => l.action);
      expect(actions).toContain('approved_user');
      expect(actions).toContain('published_course');
    });

    it('GET /api/admin/audit-logs?action=approved_user - should filter by action', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/audit-logs?action=approved_user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const logs = Array.isArray(res.body) ? res.body : res.body.data || [];
      for (const log of logs) {
        expect(log.action).toBe('approved_user');
      }
    });

    it('GET /api/admin/audit-log - should work on alias route', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/audit-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('5. RBAC Security & Role Guards', () => {
    it('Trainee token should get 403 on /api/admin/dashboard/enrollments', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/dashboard/enrollments')
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(403);
    });

    it('Trainer token should get 403 on /api/admin/announcements (POST)', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          title: 'Unauthorized announcement',
          body: 'Should fail',
          type: 'announcement',
        })
        .expect(403);
    });

    it('Unauthenticated request should get 401 on /api/admin/audit-logs', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/audit-logs')
        .expect(401);
    });
  });
});
