import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AiPdfGeneratorService } from '../src/modules/assessments/ai-pdf-generator.service';

describe('AI-Powered PDF-to-Quiz Generation Integration Suite (e2e)', () => {
  let app: INestApplication;
  let aiPdfGeneratorService: AiPdfGeneratorService;

  let adminToken: string;
  let trainerToken: string;
  let trainerBToken: string;
  let traineeToken: string;

  let trainerId: string;
  let trainerBId: string;
  let traineeId: string;
  let courseId: string;
  let questionBankId: string;
  let draftId1: string;
  let draftId2: string;

  // Sample valid text-based PDF buffer containing substantive meteorological physics notes
  const createSubstantivePdfBuffer = () => {
    const textContent = `
      Operational Numerical Weather Prediction and Atmospheric Thermodynamics
      Ministry of Earth Sciences Technical Training Manual.

      Chapter 1: Atmospheric Boundary Layer Dynamics
      The planetary boundary layer is defined as the lowest part of the troposphere directly influenced by Earth's surface.
      Under convective conditions, the planetary boundary layer height typically extends up to 2.5 km during peak diurnal heating.
      The Richardson number is a dimensionless ratio used to determine atmospheric dynamic stability and turbulence.
      When the gradient Richardson number falls below the critical threshold of 0.25, laminar airflow transitions into turbulent eddies.
      Surface heat flux is the primary mechanism responsible for driving vertical thermodynamic mixing in the lower troposphere.

      Chapter 2: Numerical Grid Assimilation Schemes
      The Weather Research and Forecasting model uses non-hydrostatic, fully compressible Euler equations.
      Horizontal grid resolution is configured at 3.0 km for operational convective-allowing regional domains.
      Doppler radar reflectivity values above 45 dBZ indicate deep convective cores with potential severe hail development.
      Satellite infrared radiance data assimilation requires bias correction schemes operating every 6 hours.
      Standard geostationary sounders capture atmospheric moisture profiles across 16 discrete spectral channels.
    `;

    // Construct valid PDF binary envelope with stream text
    const stream = `BT /F1 12 Tf 50 700 Td (${textContent.replace(/[\r\n]+/g, ' ')}) Tj ET`;
    const pdfData = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >> endobj
4 0 obj << /Length ${stream.length} >>
stream
${stream}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000300 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
400
%%EOF`;
    return Buffer.from(pdfData, 'utf-8');
  };

  // Blank / non-text PDF buffer
  const createBlankPdfBuffer = () => {
    const pdfData = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
200
%%EOF`;
    return Buffer.from(pdfData, 'utf-8');
  };

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

    aiPdfGeneratorService = moduleFixture.get<AiPdfGeneratorService>(AiPdfGeneratorService);

    // 1. Log in Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@syllabiq.gov.in', password: 'Admin@SyllabIQ2026' })
      .expect(200);
    adminToken = adminLogin.body.tokens?.accessToken || adminLogin.body.accessToken;

    // 2. Register & Approve Trainer A
    const trainerReg = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Vikram Sarabhai',
        email: 'trainer.pdf@moes.gov.in',
        password: 'Password@1234',
        role: 'trainer',
      })
      .expect(201);
    trainerId = trainerReg.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${trainerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const trainerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'trainer.pdf@moes.gov.in', password: 'Password@1234' })
      .expect(200);
    trainerToken = trainerLogin.body.tokens?.accessToken || trainerLogin.body.accessToken;

    // 3. Register & Approve Trainer B (for unauthorized ownership checks)
    const trainerBReg = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Homi Bhabha',
        email: 'trainer.b.pdf@moes.gov.in',
        password: 'Password@1234',
        role: 'trainer',
      })
      .expect(201);
    trainerBId = trainerBReg.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${trainerBId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const trainerBLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'trainer.b.pdf@moes.gov.in', password: 'Password@1234' })
      .expect(200);
    trainerBToken = trainerBLogin.body.tokens?.accessToken || trainerBLogin.body.accessToken;

    // 4. Register & Approve Trainee
    const traineeReg = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        name: 'Rahul Varma',
        email: 'trainee.pdf@moes.gov.in',
        password: 'Password@1234',
        role: 'trainee',
      })
      .expect(201);
    traineeId = traineeReg.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${traineeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const traineeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'trainee.pdf@moes.gov.in', password: 'Password@1234' })
      .expect(200);
    traineeToken = traineeLogin.body.tokens?.accessToken || traineeLogin.body.accessToken;

    // 5. Trainer A creates and publishes a course
    const courseRes = await request(app.getHttpServer())
      .post('/api/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Atmospheric Dynamics and High-Resolution Numerical Modeling',
        description: 'Advanced meteorological modeling, convective parameterizations, and satellite data assimilation.',
        difficulty: 'advanced',
        status: 'published',
      })
      .expect(201);
    courseId = courseRes.body.id;

    // 6. Trainee self-enrolls into the course
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. PDF Upload, Server-Side Extraction & Draft Generation
  // =========================================================================

  it('1. Uploading a text-based PDF extracts text and generates 10-15 draft MCQs with valid 4-option structure', async () => {
    aiPdfGeneratorService.resetRateLimit(trainerId);

    const validPdf = createSubstantivePdfBuffer();

    const res = await request(app.getHttpServer())
      .post('/api/trainer/question-banks/generate-from-pdf')
      .set('Authorization', `Bearer ${trainerToken}`)
      .attach('file', validPdf, 'Atmospheric_Physics_Manual.pdf')
      .field('courseId', courseId)
      .field('title', 'Atmospheric Dynamics AI-Generated Certification Bank')
      .field('count', '12')
      .field('difficulty', 'advanced')
      .expect(201);

    expect(res.body.questionBankId).toBeDefined();
    expect(res.body.generatedCount).toBeGreaterThanOrEqual(10);
    expect(res.body.generatedCount).toBeLessThanOrEqual(15);
    expect(res.body.sourcePdfUrl).toBeDefined();
    expect(Array.isArray(res.body.drafts)).toBe(true);

    questionBankId = res.body.questionBankId;
    const drafts = res.body.drafts;
    expect(drafts.length).toBe(res.body.generatedCount);

    draftId1 = drafts[0].id;
    draftId2 = drafts[1].id;

    // Spot-check structure of candidate questions
    for (const draft of drafts) {
      expect(draft.id).toBeDefined();
      expect(draft.question_bank_id).toBe(questionBankId);
      expect(draft.text).toBeDefined();
      expect(draft.text.length).toBeGreaterThan(15);
      expect(Array.isArray(draft.options)).toBe(true);
      expect(draft.options.length).toBe(4);
      expect(draft.correct_option_id).toBeDefined();
      expect(draft.options.some((opt: any) => opt.id === draft.correct_option_id)).toBe(true);
      expect(draft.explanation).toBeDefined();
      expect(draft.status).toBe('pending_review');
      expect(draft.source).toBe('ai_generated');
    }
  });

  // =========================================================================
  // 2. Non-Extractable / Empty PDF Error Handling
  // =========================================================================

  it('2. Uploading a PDF with no extractable text returns a clear 400 Bad Request error', async () => {
    const blankPdf = createBlankPdfBuffer();

    const res = await request(app.getHttpServer())
      .post('/api/trainer/question-banks/generate-from-pdf')
      .set('Authorization', `Bearer ${trainerToken}`)
      .attach('file', blankPdf, 'scanned_image_no_ocr.pdf')
      .field('courseId', courseId)
      .field('title', 'Blank Assessment')
      .expect(400);

    expect(res.body.message).toContain('No extractable text found in uploaded PDF');
  });

  // =========================================================================
  // 3. Draft Isolation: Trainees Cannot Access Unapproved Questions
  // =========================================================================

  it('3. Trainee is blocked from viewing pending drafts (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(403);
  });

  it('4. Live questions list is empty for question bank before trainer approval', async () => {
    // Trainer checks live questions
    const res = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  // =========================================================================
  // 4. Draft Review: Edit Draft Question
  // =========================================================================

  it('5. Trainer edits an AI draft question text and options and changes persist', async () => {
    const editedText = 'What is the critical threshold of the gradient Richardson number for laminar flow breakdown?';
    const editedOptions = [
      { id: 'opt_1', text: '0.25 (Critical dynamic threshold)' },
      { id: 'opt_2', text: '1.00 (Standard neutral baseline)' },
      { id: 'opt_3', text: '0.50 (Auxiliary threshold)' },
      { id: 'opt_4', text: '0.05 (Unstable convective core)' },
    ];
    const editedExplanation = 'Richardson numbers below 0.25 trigger Kelvin-Helmholtz shear instabilities.';

    const res = await request(app.getHttpServer())
      .patch(`/api/question-banks/${questionBankId}/ai-drafts/${draftId1}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        text: editedText,
        options: editedOptions,
        correctOptionId: 'opt_1',
        explanation: editedExplanation,
      })
      .expect(200);

    expect(res.body.id).toBe(draftId1);
    expect(res.body.text).toBe(editedText);
    expect(res.body.options[0].text).toContain('0.25');
    expect(res.body.explanation).toBe(editedExplanation);

    // Verify it persists when re-fetched
    const listRes = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    const fetched = listRes.body.find((d: any) => d.id === draftId1);
    expect(fetched).toBeDefined();
    expect(fetched.text).toBe(editedText);
  });

  // =========================================================================
  // 5. Single Question Regeneration
  // =========================================================================

  it('6. Trainer regenerates a single draft question, replacing only that specific question', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/question-banks/${questionBankId}/ai-drafts/${draftId2}/regenerate`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(201);

    expect(res.body.id).toBe(draftId2);
    expect(res.body.text).toBeDefined();
    expect(res.body.options.length).toBe(4);
    expect(res.body.correct_option_id).toBeDefined();

    // Verify draftId1 is untouched
    const listRes = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    const draft1 = listRes.body.find((d: any) => d.id === draftId1);
    expect(draft1.text).toContain('Richardson number');
  });

  // =========================================================================
  // 6. Delete / Reject Draft Question
  // =========================================================================

  it('7. Trainer deletes a draft question and it is removed from pending drafts', async () => {
    await request(app.getHttpServer())
      .delete(`/api/question-banks/${questionBankId}/ai-drafts/${draftId2}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    const listRes = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    const found = listRes.body.find((d: any) => d.id === draftId2);
    expect(found).toBeUndefined();
  });

  // =========================================================================
  // 7. Single Approval Workflow
  // =========================================================================

  it('8. Trainer approves a single draft question -> moves to live questions with source=ai_generated', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/question-banks/${questionBankId}/ai-drafts/${draftId1}/approve`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(201);

    expect(res.body.question).toBeDefined();
    expect(res.body.question.source).toBe('ai_generated');
    expect(res.body.question.text).toContain('Richardson number');

    // Live questions now has exactly 1 question
    const liveRes = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(liveRes.body.length).toBe(1);
    expect(liveRes.body[0].source).toBe('ai_generated');

    // Drafts no longer contains draftId1
    const draftRes = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(draftRes.body.some((d: any) => d.id === draftId1)).toBe(false);
  });

  // =========================================================================
  // 8. Bulk Approval Workflow
  // =========================================================================

  it('9. Trainer bulk-approves all remaining drafts -> all move to live questions table', async () => {
    const preDrafts = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    const remainingCount = preDrafts.body.length;
    expect(remainingCount).toBeGreaterThanOrEqual(8);

    const res = await request(app.getHttpServer())
      .post(`/api/question-banks/${questionBankId}/ai-drafts/approve-all`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(201);

    expect(res.body.count).toBe(remainingCount);

    // Live questions now contains all approved questions
    const liveRes = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(liveRes.body.length).toBe(remainingCount + 1); // 1 from previous single approval + remaining

    // AI drafts table for this bank is now empty
    const postDrafts = await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(200);

    expect(postDrafts.body.length).toBe(0);
  });

  // =========================================================================
  // 9. Trainee Quiz Attempt on Approved AI-Generated Questions
  // =========================================================================

  it('10. Trainee starts and completes attempt against live AI questions with scoring', async () => {
    // 1. Trainee starts attempt
    const startRes = await request(app.getHttpServer())
      .post('/api/attempts/start')
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ questionBankId })
      .expect(201);

    const attemptId = startRes.body.attempt?.id || startRes.body.id;
    expect(attemptId).toBeDefined();
    expect(Array.isArray(startRes.body.questions)).toBe(true);
    expect(startRes.body.questions.length).toBeGreaterThanOrEqual(9);

    // Verify correct answers and explanations are sanitized
    for (const q of startRes.body.questions) {
      expect(q.correct_option_id).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }

    // 2. Trainee submits answers (answer 1st question with correct option)
    const q1 = startRes.body.questions[0];
    const answers = {
      [q1.id]: q1.options[0].id,
    };

    const submitRes = await request(app.getHttpServer())
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .send({ answers })
      .expect(201);

    expect(submitRes.body.passed).toBeDefined();
    expect(submitRes.body.score).toBeDefined();

    // 3. Trainee views result breakdown with explanations
    const resultRes = await request(app.getHttpServer())
      .get(`/api/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .expect(200);

    expect(resultRes.body.questions).toBeDefined();
    expect(resultRes.body.questions[0].explanation).toBeDefined();
  });

  // =========================================================================
  // 10. Rate Limiting & Cost Control (429 Too Many Requests)
  // =========================================================================

  it('11. Exceeding 10 generation requests in 1 hour returns 429 Too Many Requests', async () => {
    aiPdfGeneratorService.resetRateLimit(trainerId);

    // Simulate 10 successful generation calls
    for (let i = 0; i < 10; i++) {
      aiPdfGeneratorService.checkRateLimit(trainerId);
    }

    // 11th request must throw 429
    expect(() => aiPdfGeneratorService.checkRateLimit(trainerId)).toThrow();

    const validPdf = createSubstantivePdfBuffer();
    const res = await request(app.getHttpServer())
      .post('/api/trainer/question-banks/generate-from-pdf')
      .set('Authorization', `Bearer ${trainerToken}`)
      .attach('file', validPdf, 'notes.pdf')
      .field('courseId', courseId)
      .expect(429);

    expect(res.body.message).toContain('Generation limit reached');

    // Clean up rate limit
    aiPdfGeneratorService.resetRateLimit(trainerId);
  });

  // =========================================================================
  // 11. Security & Ownership Authorization
  // =========================================================================

  it('12. Trainer B cannot access or edit Trainer A question bank drafts (403 Forbidden)', async () => {
    // Trainer B attempts to fetch Trainer A drafts
    await request(app.getHttpServer())
      .get(`/api/question-banks/${questionBankId}/ai-drafts`)
      .set('Authorization', `Bearer ${trainerBToken}`)
      .expect(403);

    // Trainer B attempts to edit Trainer A draft
    await request(app.getHttpServer())
      .patch(`/api/question-banks/${questionBankId}/ai-drafts/some-fake-draft-id`)
      .set('Authorization', `Bearer ${trainerBToken}`)
      .send({ text: 'Hijacked' })
      .expect(403);
  });
});
