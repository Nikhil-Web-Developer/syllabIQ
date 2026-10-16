import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const request = require('supertest');

describe('Profile & Skills Taxonomy Integration Suite (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let traineeId: string;
  let traineeToken: string;
  let trainerId: string;
  let trainerToken: string;
  let allSkills: any[] = [];
  let uploadedCertId: string;
  let signedCertUrl: string;

  const traineeEmail = `trainee_prof_${Date.now()}@moes.gov.in`;
  const trainerEmail = `trainer_prof_${Date.now()}@moes.gov.in`;
  const defaultPassword = 'SecurePassword123!';

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

    // 1. Admin Login
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@syllabiq.gov.in',
        password: 'Admin@SyllabIQ2026',
      });
    adminToken = adminRes.body.tokens.accessToken;

    // 2. Register & Approve Trainee
    const traineeSignup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Vikramaditya Trainee',
        email: traineeEmail,
        password: defaultPassword,
        role: 'trainee',
        bio: 'Atmospheric research fellow',
      });
    traineeId = traineeSignup.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${traineeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const traineeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: traineeEmail, password: defaultPassword });
    traineeToken = traineeLogin.body.tokens.accessToken;

    // 3. Register & Approve Trainer
    const trainerSignup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Prof. Hemant Trainer',
        email: trainerEmail,
        password: defaultPassword,
        role: 'trainer',
        bio: 'Lead Oceanographer and NWP Faculty',
      });
    trainerId = trainerSignup.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${trainerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const trainerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: trainerEmail, password: defaultPassword });
    trainerToken = trainerLogin.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Skills Taxonomy Endpoints', () => {
    it('GET /api/skills - should return all seeded skills', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/skills')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);
      allSkills = res.body;

      const nwpSkill = res.body.find((s: any) => s.name.includes('Numerical Weather Prediction'));
      expect(nwpSkill).toBeDefined();
    });

    it('GET /api/skills?category=Technical - should filter by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/skills?category=Technical')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((s: any) => {
        expect(s.category.toLowerCase()).toBe('technical');
      });
    });

    it('POST /api/admin/skills - Admin should create new skill', async () => {
      const newSkillName = `Autonomous Ocean Gliders ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: newSkillName,
          category: 'Domain',
        })
        .expect(201);

      expect(res.body.name).toBe(newSkillName);
      expect(res.body.category).toBe('Domain');
    });

    it('POST /api/admin/skills - Trainee should be blocked with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({
          name: 'Unauthorized Skill',
          category: 'Technical',
        })
        .expect(403);
    });
  });

  describe('2. Trainee Profile & Skills Management', () => {
    it('GET /api/users/me/profile - should return current trainee profile structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me/profile')
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('profile');
      expect(res.body).toHaveProperty('skills');
      expect(res.body).toHaveProperty('certificates');
      expect(res.body.user.email).toBe(traineeEmail);
    });

    it('PATCH /api/users/me/profile - should update qualifications, work experience, interests, bio', async () => {
      const updateData = {
        bio: 'Senior Research Fellow in Numerical Atmospheric Modeling.',
        interests: ['Monsoon Forecasting', 'High-Performance Computing'],
        qualifications: [
          { degree: 'M.Tech Atmospheric Science', institution: 'IIT Kharagpur', year: 2021 },
        ],
        work_experience: [
          { role: 'Research Fellow', organization: 'IMD Pune', duration: '2021 - Present' },
        ],
      };

      const res = await request(app.getHttpServer())
        .patch('/api/users/me/profile')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.profile.bio).toBe(updateData.bio);
      expect(res.body.profile.interests).toEqual(updateData.interests);
    });

    it('POST /api/users/me/skills - should tag 3 skills with different proficiency levels', async () => {
      const skill1 = allSkills[0];
      const skill2 = allSkills[1];
      const skill3 = allSkills[2];

      // Skill 1: Beginner
      const res1 = await request(app.getHttpServer())
        .post('/api/users/me/skills')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({
          skillId: skill1.id,
          proficiencyLevel: 'beginner',
          source: 'self_declared',
        })
        .expect(201);
      expect(res1.body.proficiency_level).toBe('beginner');

      // Skill 2: Intermediate
      const res2 = await request(app.getHttpServer())
        .post('/api/users/me/skills')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({
          skillId: skill2.id,
          proficiencyLevel: 'intermediate',
          source: 'self_declared',
        })
        .expect(201);
      expect(res2.body.proficiency_level).toBe('intermediate');

      // Skill 3: Expert
      const res3 = await request(app.getHttpServer())
        .post('/api/users/me/skills')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({
          skillId: skill3.id,
          proficiencyLevel: 'expert',
          source: 'assessed',
        })
        .expect(201);
      expect(res3.body.proficiency_level).toBe('expert');

      // Verify profile now lists all 3 skills
      const profRes = await request(app.getHttpServer())
        .get('/api/users/me/profile')
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(200);

      expect(profRes.body.skills.length).toBeGreaterThanOrEqual(3);
    });

    it('POST /api/users/me/skills - should validate proficiency_level enum (reject invalid enum with 400)', async () => {
      await request(app.getHttpServer())
        .post('/api/users/me/skills')
        .set('Authorization', `Bearer ${traineeToken}`)
        .send({
          skillId: allSkills[0].id,
          proficiencyLevel: 'ninja_master', // Invalid enum
          source: 'self_declared',
        })
        .expect(400);
    });

    it('DELETE /api/users/me/skills/:skillId - should remove a tagged skill', async () => {
      const skillToRemove = allSkills[0];

      await request(app.getHttpServer())
        .delete(`/api/users/me/skills/${skillToRemove.id}`)
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(200);

      // Verify skill was removed
      const profRes = await request(app.getHttpServer())
        .get('/api/users/me/profile')
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(200);

      const stillHas = profRes.body.skills.some((s: any) => s.skill_id === skillToRemove.id);
      expect(stillHas).toBe(false);
    });
  });

  describe('3. Certificate Upload & Signed URL Security', () => {
    it('POST /api/users/me/certificates - should upload certificate and return signed URL', async () => {
      const dummyPdfContent = Buffer.from('%PDF-1.4 mock certificate content for MoES test');

      const res = await request(app.getHttpServer())
        .post('/api/users/me/certificates')
        .set('Authorization', `Bearer ${traineeToken}`)
        .field('title', 'Advanced WRF Numerical Modeling')
        .field('issuing_body', 'National Centre for Medium Range Weather Forecasting (NCMRWF)')
        .field('issue_date', '2026-04-10')
        .attach('file', dummyPdfContent, 'ncmrwf_cert.pdf')
        .expect(201);

      expect(res.body).toHaveProperty('certificate');
      expect(res.body.certificate.title).toBe('Advanced WRF Numerical Modeling');
      expect(res.body.certificate).toHaveProperty('signed_url');
      expect(res.body.certificate.signed_url).toContain('sig=');

      uploadedCertId = res.body.certificate.id;
      signedCertUrl = res.body.certificate.signed_url;
    });

    it('GET /api/users/me/certificates - should list user certificates with signed URLs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me/certificates')
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].signed_url).toBeDefined();
    });

    it('GET signed URL - should allow file download with valid HMAC signature', async () => {
      // Fetch using the relative signed URL path
      const urlPath = signedCertUrl.replace(/^http[s]?:\/\/[^/]+/, '');
      const res = await request(app.getHttpServer())
        .get(urlPath)
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('GET signed URL - should reject tampered signature with 403 Forbidden', async () => {
      const urlPath = signedCertUrl.replace(/^http[s]?:\/\/[^/]+/, '');
      const tamperedUrl = urlPath.replace(/sig=[a-f0-9]+/, 'sig=tampered_signature_hex');

      await request(app.getHttpServer())
        .get(tamperedUrl)
        .expect(403);
    });
  });

  describe('4. Trainer Profile & Shared Competency Tagging', () => {
    it('GET /api/users/me/trainer-profile - should return trainer profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me/trainer-profile')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(res.body.user.role).toBe('trainer');
      expect(res.body).toHaveProperty('profile');
      expect(res.body).toHaveProperty('skills');
    });

    it('PATCH /api/users/me/trainer-profile - should update bio, years of experience, qualifications', async () => {
      const trainerData = {
        bio: 'Senior Faculty in Computational Ocean Dynamics with 14 years of research.',
        years_experience: 14,
        qualifications: [
          { degree: 'Ph.D. Physical Oceanography', institution: 'Goa University', year: 2010 },
        ],
      };

      const res = await request(app.getHttpServer())
        .patch('/api/users/me/trainer-profile')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(trainerData)
        .expect(200);

      expect(res.body.profile.years_experience).toBe(14);
      expect(res.body.profile.bio).toBe(trainerData.bio);
    });

    it('POST /api/users/me/skills - Trainer tags competencies using same shared endpoint', async () => {
      const domainSkill = allSkills[0];

      const res = await request(app.getHttpServer())
        .post('/api/users/me/skills')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          skillId: domainSkill.id,
          proficiencyLevel: 'expert',
          source: 'certified',
        })
        .expect(201);

      expect(res.body.proficiency_level).toBe('expert');
      expect(res.body.source).toBe('certified');
    });
  });

  describe('5. View-Others & Public Profile Security', () => {
    it('GET /api/users/:id/profile - should return public fields only (no email or password)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${trainerId}/profile`)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.name).toBe('Prof. Hemant Trainer');
      expect(res.body.user.role).toBe('trainer');
      expect(res.body.user.email).toBeUndefined(); // Email must be hidden
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body).toHaveProperty('profile');
      expect(res.body).toHaveProperty('skills');
    });
  });
});
