const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Seeding Live Backend at http://localhost:4000/api ...');

  // 1. Admin Login
  const adminRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@syllabiq.gov.in', password: 'Admin@SyllabIQ2026' }
  );

  const adminToken = adminRes.data.tokens?.accessToken;
  console.log('Admin Logged in:', !!adminToken);

  // Helper to register & approve
  async function setupTrainer(name, email, yearsExp, bio) {
    const signup = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/signup',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { name, email, password: 'SecurePassword123!', role: 'trainer', bio }
    );

    const trainerId = signup.data.user?.id;
    if (trainerId) {
      await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/admin/users/${trainerId}/approve`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    const login = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email, password: 'SecurePassword123!' }
    );

    const token = login.data.tokens?.accessToken;

    if (token) {
      await request(
        {
          hostname: 'localhost',
          port: 4000,
          path: '/api/users/me/trainer-profile',
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        },
        { bio, years_experience: yearsExp }
      );
    }

    return { id: trainerId || login.data.user?.id, token, name, email };
  }

  // 2. Fetch NWP skill
  const skillsRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/skills',
    method: 'GET',
  });

  const nwpSkill = skillsRes.data.find(
    (s) => s.name === 'Numerical Weather Prediction (NWP)'
  ) || skillsRes.data[0];
  console.log('Using Skill:', nwpSkill.name, nwpSkill.id);

  // Setup Trainers
  const alice = await setupTrainer(
    'Dr. Alice Roy',
    'alice.roy@imd.gov.in',
    8,
    'Senior Atmospheric Scientist and Modeling Lead with 8 years experience leading national NWP capacity workshops.'
  );
  const bob = await setupTrainer(
    'Dr. Bob Verma',
    'bob.verma@incois.gov.in',
    15,
    'Principal Oceanographer & NWP Specialist with 15 years domain research at INCOIS.'
  );
  const charlie = await setupTrainer(
    'Dr. Charlie Gupta',
    'charlie.gupta@ncpor.gov.in',
    3,
    'Junior Cryospheric & Polar Sciences Researcher with 3 years experience.'
  );

  console.log('Trainers created:', alice.name, bob.name, charlie.name);

  // Tag Skills
  await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/users/me/skills',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
    },
    { skillId: nwpSkill.id, proficiencyLevel: 'expert', source: 'certified' }
  );

  await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/users/me/skills',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bob.token}` },
    },
    { skillId: nwpSkill.id, proficiencyLevel: 'advanced', source: 'self_declared' }
  );

  await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/users/me/skills',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${charlie.token}` },
    },
    { skillId: nwpSkill.id, proficiencyLevel: 'intermediate', source: 'self_declared' }
  );

  // Create Trainee for feedback
  const traineeSignup = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Rohan Sharma Trainee',
      email: 'rohan.trainee@imd.gov.in',
      password: 'SecurePassword123!',
      role: 'trainee',
    }
  );
  const traineeId = traineeSignup.data.user?.id;
  if (traineeId) {
    await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/admin/users/${traineeId}/approve`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  const traineeLogin = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'rohan.trainee@imd.gov.in', password: 'SecurePassword123!' }
  );
  const traineeToken = traineeLogin.data.tokens?.accessToken;

  // Alice creates 4 courses
  const aCourse1 = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/courses',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
    },
    {
      title: 'WRF Atmospheric Modeling Level 1',
      description: 'Foundations of numerical weather prediction with WRF 4.0.',
      subjectSkillId: nwpSkill.id,
      difficulty: 'beginner',
      status: 'published',
    }
  );

  const aCourse2 = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/courses',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
    },
    {
      title: 'High Resolution NWP Data Assimilation',
      description: 'Advanced 3D-Var and 4D-Var data assimilation.',
      subjectSkillId: nwpSkill.id,
      difficulty: 'advanced',
      status: 'published',
    }
  );

  await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/courses',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
    },
    {
      title: 'Ensemble Weather Forecasting',
      description: 'Probabilistic weather forecasting using ensemble systems.',
      subjectSkillId: nwpSkill.id,
      difficulty: 'intermediate',
      status: 'published',
    }
  );

  await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/courses',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.token}` },
    },
    {
      title: 'Tropical Cyclone NWP Tracking',
      description: 'Tracking and intensity prediction of severe cyclonic storms.',
      subjectSkillId: nwpSkill.id,
      difficulty: 'advanced',
      status: 'published',
    }
  );

  // Bob creates 2 courses
  const bCourse1 = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/courses',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bob.token}` },
    },
    {
      title: 'Ocean-Atmosphere Coupled Modeling',
      description: 'Coupled models for monsoon and cyclone forecasting.',
      subjectSkillId: nwpSkill.id,
      difficulty: 'intermediate',
      status: 'published',
    }
  );

  await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/courses',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bob.token}` },
    },
    {
      title: 'Hydrodynamic Wave Modeling',
      description: 'Wave modeling and coastal hydrodynamics.',
      subjectSkillId: nwpSkill.id,
      difficulty: 'advanced',
      status: 'published',
    }
  );

  // Trainee enrolls and provides feedback:
  // Alice: [4, 5, 5, 4, 5] -> avg = 4.60
  if (aCourse1.data?.id && traineeToken) {
    await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/courses/${aCourse1.data.id}/enroll`,
      method: 'POST',
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/courses/${aCourse1.data.id}/feedback`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${traineeToken}` },
      },
      { rating: 4, comment: 'Great depth and practical WRF examples.' }
    );
  }

  if (aCourse2.data?.id && traineeToken) {
    await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/courses/${aCourse2.data.id}/enroll`,
      method: 'POST',
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/courses/${aCourse2.data.id}/feedback`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${traineeToken}` },
      },
      { rating: 5, comment: 'Masterclass in data assimilation!' }
    );
  }

  // Bob's course feedback: rating 5
  if (bCourse1.data?.id && traineeToken) {
    await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/courses/${bCourse1.data.id}/enroll`,
      method: 'POST',
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/courses/${bCourse1.data.id}/feedback`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${traineeToken}` },
      },
      { rating: 5, comment: 'Outstanding ocean-atmosphere modeling course!' }
    );
  }

  // Create Target Course needing faculty assignment
  const targetCourse = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/courses',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    },
    {
      title: 'Operational NWP & Severe Weather Forecasting Workshop 2026',
      description: 'Intensive capacity building workshop on numerical weather prediction models for regional meteorological centers.',
      subjectSkillId: nwpSkill.id,
      difficulty: 'advanced',
      status: 'published',
    }
  );

  console.log('Target Course created:', targetCourse.data?.title, targetCourse.data?.id);

  // Test match query
  const match = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/admin/competency/match?course_id=${targetCourse.data.id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log('Match Result for Target Course:');
  console.log(JSON.stringify(match.data, null, 2));
}

run().catch(console.error);
