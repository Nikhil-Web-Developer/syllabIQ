import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Courses, Resources & Enrollment Integration (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let trainerToken: string;
  let trainerBToken: string;
  let traineeToken: string;
  let skillId: string;
  let courseId: string;
  let enrollmentId: string;
  let resourceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    // 1. Sign up & log in Trainer A
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Anita Sharma',
        email: 'anita.trainer@imd.gov.in',
        password: 'TrainerPassword@123',
        role: 'trainer',
        bio: 'Senior NWP Modeler',
      });

    // 2. Sign up Trainer B (for RBAC checks)
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Vikram Seth',
        email: 'vikram.trainer@imd.gov.in',
        password: 'TrainerPassword@123',
        role: 'trainer',
        bio: 'Radar Specialist',
      });

    // 3. Sign up Trainee
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Rohan Sharma',
        email: 'rohan.trainee@moes.gov.in',
        password: 'TraineePassword@123',
        role: 'trainee',
        bio: 'Graduate Trainee',
      });

    // 4. Log in Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@syllabiq.gov.in',
        password: 'Admin@SyllabIQ2026',
      });
    adminToken = adminLoginRes.body.tokens?.accessToken || adminLoginRes.body.access_token;

    // Approve users
    const usersRes = await request(app.getHttpServer())
      .get('/api/admin/users?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    const userList = Array.isArray(usersRes.body) ? usersRes.body : usersRes.body?.data || [];
    for (const u of userList) {
      await request(app.getHttpServer())
        .patch(`/api/admin/users/${u.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });
    }

    // Log in approved Trainer A
    const trainerLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'anita.trainer@imd.gov.in',
        password: 'TrainerPassword@123',
      });
    trainerToken = trainerLoginRes.body.tokens?.accessToken || trainerLoginRes.body.access_token;

    // Log in approved Trainer B
    const trainerBLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'vikram.trainer@imd.gov.in',
        password: 'TrainerPassword@123',
      });
    trainerBToken = trainerBLoginRes.body.tokens?.accessToken || trainerBLoginRes.body.access_token;

    // Log in approved Trainee
    const traineeLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'rohan.trainee@moes.gov.in',
        password: 'TraineePassword@123',
      });
    traineeToken = traineeLoginRes.body.tokens?.accessToken || traineeLoginRes.body.access_token;

    // Fetch skills to get a skillId
    const skillsRes = await request(app.getHttpServer()).get('/api/skills');
    skillId = skillsRes.body[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // Test Suite 1: Course Lifecycle & Authoring
  // ==========================================

  it('1. Trainer A creates a new course module (defaults to draft)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Operational Numerical Weather Prediction with WRF 4.0',
        description: 'Comprehensive atmospheric modeling, physics schemes, boundary conditions, and HPC workflows.',
        subjectSkillId: skillId,
        difficulty: 'intermediate',
        status: 'draft',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toContain('WRF 4.0');
    expect(res.body.status).toBe('draft');
    courseId = res.body.id;
  });

  it('2. Public catalog excludes draft courses', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/courses')
      .expect(200);

    const found = res.body.find((c: any) => c.id === courseId);
    expect(found).toBeUndefined();
  });

  it('3. Trainer B is forbidden from updating Trainer A course', async () => {
    await request(app.getHttpServer())
      .patch(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${trainerBToken}`)
      .send({ title: 'Hijacked Course Title' })
      .expect(403);
  });

  it('4. Trainee cannot self-enroll in a draft course', async () => {
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(400);
  });

  it('5. Trainer A publishes the course', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(res.body.status).toBe('published');
  });

  it('6. Public catalog now includes the published course', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/courses')
      .expect(200);

    if (!res.body || res.body.length === 0) {
      throw new Error(`DEBUG_EMPTY: res.body is ${JSON.stringify(res.body)} for courseId=${courseId}`);
    }

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((c: any) => c.id === courseId || c.title?.includes('WRF 4.0'));
    expect(found).toBeDefined();
  });

  // ==========================================
  // Test Suite 2: Resource Library & Uploads
  // ==========================================

  it('7. Trainer A uploads a PDF lecture resource', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/resources`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .field('title', 'Module 1: WRF Model Formulation & Grids')
      .field('type', 'pdf')
      .attach('file', Buffer.from('%PDF-1.4 Mock PDF Content for WRF Grid Training'), 'module1_grid.pdf')
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Module 1: WRF Model Formulation & Grids');
    expect(res.body.type).toBe('pdf');
    expect(res.body.signed_url).toContain('/api/storage/files/');
    resourceId = res.body.id;
  });

  it('8. Trainer A adds an external documentation Link resource', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/resources`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'NCAR WRF User Guide & Namelist Docs',
        type: 'link',
        link_url: 'https://www.mmm.ucar.edu/models/wrf',
      })
      .expect(201);

    expect(res.body.type).toBe('link');
    expect(res.body.file_url).toContain('ucar.edu');
  });

  it('9. Trainee cannot access course resources BEFORE enrolling (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/resources`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(403);
  });

  // ==========================================
  // Test Suite 3: Self-Enrollment & Monitoring
  // ==========================================

  it('10. Trainee successfully self-enrolls in the published course', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(201);

    expect(res.body.enrollment).toBeDefined();
    expect(res.body.enrollment.progress_percent).toBe(0);
    expect(res.body.enrollment.status).toBe('active');
    enrollmentId = res.body.enrollment.id;
  });

  it('11. Duplicate enrollment is rejected with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(409);
  });

  it('12. Enrolled trainee can now access course resources with signed URLs', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/resources`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const pdfResource = res.body.find((r: any) => r.type === 'pdf');
    expect(pdfResource).toBeDefined();
    expect(pdfResource.signed_url).toContain('sig=');
  });

  it('13. Trainee gets personal enrollments with progress', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/enrollments')
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].course_id).toBe(courseId);
    expect(res.body[0].progress_percent).toBe(0);
  });

  it('14. Trainee updates progress to 65%', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/enrollments/${enrollmentId}/progress`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ progress_percent: 65 })
      .expect(200);

    expect(res.body.enrollment.progress_percent).toBe(65);
    expect(res.body.enrollment.status).toBe('active');
  });

  it('15. Trainee completes course (100%) and status becomes completed', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/enrollments/${enrollmentId}/progress`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ progress_percent: 100 })
      .expect(200);

    expect(res.body.enrollment.progress_percent).toBe(100);
    expect(res.body.enrollment.status).toBe('completed');
  });

  it('16. Trainer A monitors course enrollments and sees trainee progress', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(res.body.totalEnrollments).toBe(1);
    expect(res.body.enrollments[0].trainee_name).toBe('Rohan Sharma');
    expect(res.body.enrollments[0].progress_percent).toBe(100);
  });

  it('17. Trainer B cannot monitor Trainer A course enrollments (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${trainerBToken}`)
      .expect(403);
  });

  it('18. Attempting to delete a course with active enrollments archives it safely', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(res.body.archived).toBe(true);
    expect(res.body.deleted).toBe(false);
  });
});
