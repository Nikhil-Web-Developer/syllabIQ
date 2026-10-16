import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { DatabaseService } from '../src/database/database.service';

const request = require('supertest');

describe('Competency-Matching Engine Integration Suite (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  let adminToken: string;
  let adminId: string;

  let traineeToken: string;
  let traineeId: string;

  let trainerAToken: string;
  let trainerAId: string; // Alice (Expert, 8 yrs, 4 courses, avg rating 4.6)

  let trainerBToken: string;
  let trainerBId: string; // Bob (Advanced, 15 yrs, 2 courses, avg rating 5.0)

  let trainerCToken: string;
  let trainerCId: string; // Charlie (Intermediate, 3 yrs, 0 courses, 0 rating)

  let nwpSkillId: string;
  let unassignedSkillId: string;
  let targetCourseId: string;

  const defaultPassword = 'SecurePassword123!';
  const timestamp = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    db = app.get(DatabaseService);

    // 1. Admin Login
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@syllabiq.gov.in',
        password: 'Admin@SyllabIQ2026',
      });
    adminToken = adminRes.body.tokens.accessToken;
    adminId = adminRes.body.user.id;

    // 2. Trainee Registration & Approval
    const traineeRes = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Trainee User',
        email: `trainee_comp_${timestamp}@syllabiq.gov.in`,
        password: defaultPassword,
        role: 'trainee',
      });
    traineeId = traineeRes.body.user.id;
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${traineeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    const traineeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `trainee_comp_${timestamp}@syllabiq.gov.in`, password: defaultPassword });
    traineeToken = traineeLogin.body.tokens.accessToken;

    // 3. Register Trainer A (Dr. Alice Roy)
    const trainerARes = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Alice Roy',
        email: `alice_${timestamp}@imd.gov.in`,
        password: defaultPassword,
        role: 'trainer',
      });
    trainerAId = trainerARes.body.user.id;
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${trainerAId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    const trainerALogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `alice_${timestamp}@imd.gov.in`, password: defaultPassword });
    trainerAToken = trainerALogin.body.tokens.accessToken;

    // 4. Register Trainer B (Dr. Bob Verma)
    const trainerBRes = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Bob Verma',
        email: `bob_${timestamp}@incois.gov.in`,
        password: defaultPassword,
        role: 'trainer',
      });
    trainerBId = trainerBRes.body.user.id;
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${trainerBId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    const trainerBLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `bob_${timestamp}@incois.gov.in`, password: defaultPassword });
    trainerBToken = trainerBLogin.body.tokens.accessToken;

    // 5. Register Trainer C (Dr. Charlie Gupta)
    const trainerCRes = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Charlie Gupta',
        email: `charlie_${timestamp}@ncpor.gov.in`,
        password: defaultPassword,
        role: 'trainer',
      });
    trainerCId = trainerCRes.body.user.id;
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${trainerCId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    const trainerCLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `charlie_${timestamp}@ncpor.gov.in`, password: defaultPassword });
    trainerCToken = trainerCLogin.body.tokens.accessToken;

    // 6. Find or create Skills
    const skillRes = await db.query(
      "SELECT id FROM skills WHERE name = 'Numerical Weather Prediction (NWP)'",
    );
    if (skillRes.rows.length > 0) {
      nwpSkillId = skillRes.rows[0].id;
    } else {
      const newSkill = await db.query(
        "INSERT INTO skills (name, category) VALUES ('Numerical Weather Prediction (NWP)', 'Domain') RETURNING id",
      );
      nwpSkillId = newSkill.rows[0].id;
    }

    const unassignedSkillRes = await db.query(
      `INSERT INTO skills (name, category) VALUES ('Rare Cryospheric Subskill ${timestamp}', 'Domain') RETURNING id`,
    );
    unassignedSkillId = unassignedSkillRes.rows[0].id;

    // 7. Seed Trainer Profiles (Years of Experience)
    // Trainer A: 8 years
    await db.query(
      'UPDATE trainer_profiles SET years_experience = 8 WHERE user_id = $1',
      [trainerAId],
    );
    // Trainer B: 15 years
    await db.query(
      'UPDATE trainer_profiles SET years_experience = 15 WHERE user_id = $1',
      [trainerBId],
    );
    // Trainer C: 3 years
    await db.query(
      'UPDATE trainer_profiles SET years_experience = 3 WHERE user_id = $1',
      [trainerCId],
    );

    // 8. Tag Skills to Trainers
    // Trainer A: NWP Expert
    await request(app.getHttpServer())
      .post('/api/users/me/skills')
      .set('Authorization', `Bearer ${trainerAToken}`)
      .send({
        skillId: nwpSkillId,
        proficiencyLevel: 'expert',
        source: 'certified',
      });

    // Trainer B: NWP Advanced
    await request(app.getHttpServer())
      .post('/api/users/me/skills')
      .set('Authorization', `Bearer ${trainerBToken}`)
      .send({
        skillId: nwpSkillId,
        proficiencyLevel: 'advanced',
        source: 'self_declared',
      });

    // Trainer C: NWP Intermediate
    await request(app.getHttpServer())
      .post('/api/users/me/skills')
      .set('Authorization', `Bearer ${trainerCToken}`)
      .send({
        skillId: nwpSkillId,
        proficiencyLevel: 'intermediate',
        source: 'self_declared',
      });

    // 9. Create Courses for Trainer A (4 NWP courses)
    // Course A1
    const cA1 = await db.query(
      `INSERT INTO courses (title, description, trainer_id, subject_skill_id, difficulty, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['NWP Fundamentals', 'Course 1', trainerAId, nwpSkillId, 'beginner', 'published'],
    );
    // Course A2
    const cA2 = await db.query(
      `INSERT INTO courses (title, description, trainer_id, subject_skill_id, difficulty, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['Advanced NWP WRF', 'Course 2', trainerAId, nwpSkillId, 'advanced', 'published'],
    );
    // Course A3
    await db.query(
      `INSERT INTO courses (title, description, trainer_id, subject_skill_id, difficulty, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['NWP Data Assimilation', 'Course 3', trainerAId, nwpSkillId, 'intermediate', 'published'],
    );
    // Course A4
    await db.query(
      `INSERT INTO courses (title, description, trainer_id, subject_skill_id, difficulty, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Ensemble Prediction Systems', 'Course 4', trainerAId, nwpSkillId, 'advanced', 'published'],
    );

    // Create Feedback for Trainer A: ratings [4, 5, 5, 4, 5] -> avg = 23/5 = 4.60
    // Feedback 1 (rating 4) on Course A1
    await db.query(
      `INSERT INTO feedback (course_id, trainee_id, rating, comment) VALUES ($1, $2, 4, 'Great')`,
      [cA1.rows[0].id, traineeId],
    );
    // Add additional feedback directly into DB to seed exact ratings
    const trainee2 = await db.query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ('Trainee 2', 't2_${timestamp}@moes.gov.in', 'hash', 'trainee', 'approved') RETURNING id`,
    );
    const trainee3 = await db.query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ('Trainee 3', 't3_${timestamp}@moes.gov.in', 'hash', 'trainee', 'approved') RETURNING id`,
    );
    const trainee4 = await db.query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ('Trainee 4', 't4_${timestamp}@moes.gov.in', 'hash', 'trainee', 'approved') RETURNING id`,
    );
    const trainee5 = await db.query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ('Trainee 5', 't5_${timestamp}@moes.gov.in', 'hash', 'trainee', 'approved') RETURNING id`,
    );

    await db.query(
      `INSERT INTO feedback (course_id, trainee_id, rating, comment) VALUES ($1, $2, 5, 'Superb')`,
      [cA1.rows[0].id, trainee2.rows[0].id],
    );
    await db.query(
      `INSERT INTO feedback (course_id, trainee_id, rating, comment) VALUES ($1, $2, 5, 'Excellent')`,
      [cA2.rows[0].id, trainee3.rows[0].id],
    );
    await db.query(
      `INSERT INTO feedback (course_id, trainee_id, rating, comment) VALUES ($1, $2, 4, 'Very good')`,
      [cA2.rows[0].id, trainee4.rows[0].id],
    );
    await db.query(
      `INSERT INTO feedback (course_id, trainee_id, rating, comment) VALUES ($1, $2, 5, 'Masterclass')`,
      [cA2.rows[0].id, trainee5.rows[0].id],
    );

    // 10. Create Courses for Trainer B (2 NWP courses)
    const cB1 = await db.query(
      `INSERT INTO courses (title, description, trainer_id, subject_skill_id, difficulty, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['NWP Atmospheric Models', 'Course B1', trainerBId, nwpSkillId, 'intermediate', 'published'],
    );
    await db.query(
      `INSERT INTO courses (title, description, trainer_id, subject_skill_id, difficulty, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Coupled NWP Modeling', 'Course B2', trainerBId, nwpSkillId, 'advanced', 'published'],
    );

    // Feedback for Trainer B: ratings [5, 5] -> avg = 5.0
    await db.query(
      `INSERT INTO feedback (course_id, trainee_id, rating, comment) VALUES ($1, $2, 5, 'Flawless')`,
      [cB1.rows[0].id, traineeId],
    );
    await db.query(
      `INSERT INTO feedback (course_id, trainee_id, rating, comment) VALUES ($1, $2, 5, 'Outstanding')`,
      [cB1.rows[0].id, trainee2.rows[0].id],
    );

    // Trainer C has 0 courses and 0 ratings for NWP

    // 11. Target Course for matching (created by Admin, awaiting faculty assignment)
    const targetCourseRes = await db.query(
      `INSERT INTO courses (title, description, trainer_id, subject_skill_id, difficulty, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['Operational NWP Workshop 2026', 'Target course for algorithm', adminId, nwpSkillId, 'intermediate', 'draft'],
    );
    targetCourseId = targetCourseRes.rows[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Hand-Calculated Algorithm Score & Ranking Verification', () => {
    it('GET /api/admin/competency/match?course_id=... - matches exact hand calculation to 3 decimal places', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/competency/match?course_id=${targetCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('trainers');
      expect(res.body.trainers.length).toBeGreaterThanOrEqual(3);

      const candidateA = res.body.trainers.find((t: any) => t.trainerId === trainerAId);
      const candidateB = res.body.trainers.find((t: any) => t.trainerId === trainerBId);
      const candidateC = res.body.trainers.find((t: any) => t.trainerId === trainerCId);

      expect(candidateA).toBeDefined();
      expect(candidateB).toBeDefined();
      expect(candidateC).toBeDefined();

      // Hand calculation assertions:
      // Trainer A (Alice):
      // - Proficiency Weight: expert = 1.0 -> 1.0 * 0.5 = 0.500
      // - Experience Normalized: 8 / 10 = 0.8 -> 0.8 * 0.2 = 0.160
      // - Rating Normalized: 4.6 / 5.0 = 0.92 -> 0.92 * 0.2 = 0.184
      // - Courses Normalized: 4 / 4 = 1.0 -> 1.0 * 0.1 = 0.100
      // - Total Score = 0.500 + 0.160 + 0.184 + 0.100 = 0.944
      expect(candidateA.score).toBe(0.944);
      expect(candidateA.scoreBreakdown.proficiencyLevelWeight).toBe(1.0);
      expect(candidateA.scoreBreakdown.proficiencyWeighted).toBe(0.5);
      expect(candidateA.scoreBreakdown.yearsExperienceNormalized).toBe(0.8);
      expect(candidateA.scoreBreakdown.yearsExperienceWeighted).toBe(0.16);
      expect(candidateA.scoreBreakdown.avgRatingNormalized).toBe(0.92);
      expect(candidateA.scoreBreakdown.avgRatingWeighted).toBe(0.184);
      expect(candidateA.scoreBreakdown.priorCoursesNormalized).toBe(1.0);
      expect(candidateA.scoreBreakdown.priorCoursesWeighted).toBe(0.1);

      // Trainer B (Bob):
      // - Proficiency Weight: advanced = 0.75 -> 0.75 * 0.5 = 0.375
      // - Experience Normalized: min(15 / 10, 1.0) = 1.0 -> 1.0 * 0.2 = 0.200
      // - Rating Normalized: 5.0 / 5.0 = 1.0 -> 1.0 * 0.2 = 0.200
      // - Courses Normalized: 2 / 4 = 0.5 -> 0.5 * 0.1 = 0.050
      // - Total Score = 0.375 + 0.200 + 0.200 + 0.050 = 0.825
      expect(candidateB.score).toBe(0.825);
      expect(candidateB.scoreBreakdown.proficiencyLevelWeight).toBe(0.75);
      expect(candidateB.scoreBreakdown.proficiencyWeighted).toBe(0.375);
      expect(candidateB.scoreBreakdown.yearsExperienceNormalized).toBe(1.0);
      expect(candidateB.scoreBreakdown.yearsExperienceWeighted).toBe(0.2);
      expect(candidateB.scoreBreakdown.avgRatingNormalized).toBe(1.0);
      expect(candidateB.scoreBreakdown.avgRatingWeighted).toBe(0.2);
      expect(candidateB.scoreBreakdown.priorCoursesNormalized).toBe(0.5);
      expect(candidateB.scoreBreakdown.priorCoursesWeighted).toBe(0.05);

      // Trainer C (Charlie):
      // - Proficiency Weight: intermediate = 0.5 -> 0.5 * 0.5 = 0.250
      // - Experience Normalized: 3 / 10 = 0.3 -> 0.3 * 0.2 = 0.060
      // - Rating Normalized: 0 -> 0.0 * 0.2 = 0.000
      // - Courses Normalized: 0 / 4 = 0 -> 0.0 * 0.1 = 0.000
      // - Total Score = 0.250 + 0.060 + 0.000 + 0.000 = 0.310
      expect(candidateC.score).toBe(0.310);
      expect(candidateC.scoreBreakdown.proficiencyLevelWeight).toBe(0.5);
      expect(candidateC.scoreBreakdown.proficiencyWeighted).toBe(0.25);
      expect(candidateC.scoreBreakdown.yearsExperienceNormalized).toBe(0.3);
      expect(candidateC.scoreBreakdown.yearsExperienceWeighted).toBe(0.06);
      expect(candidateC.scoreBreakdown.avgRatingNormalized).toBe(0.0);
      expect(candidateC.scoreBreakdown.avgRatingWeighted).toBe(0.0);
      expect(candidateC.scoreBreakdown.priorCoursesNormalized).toBe(0.0);
      expect(candidateC.scoreBreakdown.priorCoursesWeighted).toBe(0.0);

      // Verify strict ranking order: Alice (0.944) > Bob (0.825) > Charlie (0.310)
      const scores = res.body.trainers.map((t: any) => t.score);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
      expect(res.body.trainers[0].trainerId).toBe(trainerAId);
      expect(res.body.trainers[1].trainerId).toBe(trainerBId);
      expect(res.body.trainers[2].trainerId).toBe(trainerCId);
    });

    it('GET /api/admin/competency/match?skill_id=... - works on raw skill taxonomy ID without course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/competency/match?skill_id=${nwpSkillId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.skill).toBeDefined();
      expect(res.body.skill.name).toBe('Numerical Weather Prediction (NWP)');
      expect(res.body.course).toBeNull();
      expect(res.body.trainers.length).toBeGreaterThanOrEqual(3);
      expect(res.body.trainers[0].trainerId).toBe(trainerAId);
    });
  });

  describe('2. Edge Cases & Boundary Handling', () => {
    it('GET /api/admin/competency/match?skill_id=... on skill with 0 tagged trainers returns empty list gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/competency/match?skill_id=${unassignedSkillId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.trainers).toEqual([]);
      expect(res.body.totalMatches).toBe(0);
      expect(res.body.message).toContain('No approved trainers have tagged this skill');
    });

    it('Missing course_id and skill_id query parameters throws 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/competency/match')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('Invalid course_id throws 404 Not Found', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/competency/match?course_id=00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('3. Security & Role Guards', () => {
    it('Trainee is blocked with 403 Forbidden from accessing matching endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/api/admin/competency/match?course_id=${targetCourseId}`)
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(403);
    });

    it('Trainer is blocked with 403 Forbidden from accessing matching endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/api/admin/competency/match?course_id=${targetCourseId}`)
        .set('Authorization', `Bearer ${trainerAToken}`)
        .expect(403);
    });

    it('Unauthenticated request is blocked with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get(`/api/admin/competency/match?course_id=${targetCourseId}`)
        .expect(401);
    });
  });

  describe('4. Human Decision: Admin Manual Course-Trainer Assignment', () => {
    it('POST /api/admin/courses/:id/assign-trainer - assigns course to ranked trainer and logs audit', async () => {
      // Assign Dr. Alice Roy (Rank 1) to target course
      const assignRes = await request(app.getHttpServer())
        .post(`/api/admin/courses/${targetCourseId}/assign-trainer`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trainer_id: trainerAId })
        .expect(201);

      expect(assignRes.body).toHaveProperty('message');
      expect(assignRes.body.course.trainer_id).toBe(trainerAId);
      expect(assignRes.body.course.trainer_name).toBe('Dr. Alice Roy');

      // Verify in Database
      const courseInDb = await db.query('SELECT trainer_id FROM courses WHERE id = $1', [targetCourseId]);
      expect(courseInDb.rows[0].trainer_id).toBe(trainerAId);

      // Verify Audit Log
      const auditRes = await request(app.getHttpServer())
        .get('/api/admin/audit-logs?limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const assignLog = auditRes.body.find(
        (log: any) => log.action === 'assigned_trainer' && log.target_id === targetCourseId,
      );
      expect(assignLog).toBeDefined();
      expect(assignLog.metadata.newTrainerId).toBe(trainerAId);
      expect(assignLog.metadata.trainerName).toBe('Dr. Alice Roy');
    });

    it('Non-admin is blocked with 403 Forbidden from assigning trainer', async () => {
      await request(app.getHttpServer())
        .post(`/api/admin/courses/${targetCourseId}/assign-trainer`)
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({ trainer_id: trainerBId })
        .expect(403);
    });
  });
});
