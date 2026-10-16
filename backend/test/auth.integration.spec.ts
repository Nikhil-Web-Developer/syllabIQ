import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const request = require('supertest');

describe('Authentication & RBAC Integration Flow (e2e)', () => {
  let app: INestApplication;
  let traineeId: string;
  let adminToken: string;
  let traineeToken: string;
  let traineeRefreshToken: string;
  const uniqueEmail = `trainee_${Date.now()}@moes.gov.in`;
  const traineePassword = 'SecurePassword123!';
  const newTraineePassword = 'NewSecurePassword456!';

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Signup: Trainee should register with status "pending"', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Test Trainee Officer',
        email: uniqueEmail,
        password: traineePassword,
        role: 'trainee',
        bio: 'Numerical modeling officer trainee',
      })
      .expect(201);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.body.user.role).toBe('trainee');
    expect(res.body.user.status).toBe('pending');
    traineeId = res.body.user.id;
  });

  it('2. Blocked Login: Pending trainee login should be rejected with 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: traineePassword,
      })
      .expect(403);

    expect(res.body.message).toContain('pending administrator approval');
  });

  it('3. Admin Login: Seeded admin should log in successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@syllabiq.gov.in',
        password: 'Admin@SyllabIQ2026',
      })
      .expect(200);

    expect(res.body).toHaveProperty('tokens');
    expect(res.body.user.role).toBe('admin');
    adminToken = res.body.tokens.accessToken;
  });

  it('4. Admin Approval: Admin should approve the pending trainee', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/users/${traineeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.user.status).toBe('approved');
  });

  it('5. Successful Trainee Login: Approved trainee can now log in and receive tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: traineePassword,
      })
      .expect(200);

    expect(res.body.user.status).toBe('approved');
    expect(res.body.tokens).toHaveProperty('accessToken');
    expect(res.body.tokens).toHaveProperty('refreshToken');
    traineeToken = res.body.tokens.accessToken;
    traineeRefreshToken = res.body.tokens.refreshToken;
  });

  it('6. RBAC Guard: Trainee calling Admin-only route should be blocked with 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(403);

    expect(res.body.message).toContain('Forbidden');
  });

  it('7. Token Refresh: Trainee refresh token should issue a new access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: traineeRefreshToken,
      })
      .expect(200);

    expect(res.body.tokens).toHaveProperty('accessToken');
  });

  it('8. Password Reset: Request reset and update password', async () => {
    const resetReq = await request(app.getHttpServer())
      .post('/api/auth/request-reset')
      .send({ email: uniqueEmail })
      .expect(200);

    const token = resetReq.body.resetTokenStub;
    expect(token).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({
        token,
        newPassword: newTraineePassword,
      })
      .expect(200);

    // Verify login with new password
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: newTraineePassword,
      })
      .expect(200);

    expect(loginRes.body.user.email).toBe(uniqueEmail);
  });
});
