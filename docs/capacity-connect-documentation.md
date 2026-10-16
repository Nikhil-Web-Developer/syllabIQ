# CAPACITY CONNECT
## Digital Capacity Building & Learning Management Portal — Full Technical Documentation

**Problem Statement:** SIH26076 · Ministry of Earth Sciences (MoES) · Smart India Hackathon 2026
**Document purpose:** End-to-end build reference — architecture, features, tech stack, database, APIs, and development roadmap.

---

## 1. Project Overview

Capacity Connect is a centralized, web-based Learning Management & Capacity Building platform with three roles — **Trainee**, **Trainer**, **Admin** — supporting course delivery, competency-based trainer matching, MCQ assessments, resource libraries, and organizational analytics.

### 1.1 Core Objectives
- Centralize organizational training, knowledge sharing, and competency development
- Automate trainer-to-subject matching using structured competency data
- Provide measurable analytics on participation, certification, and skill growth
- Be secure, scalable, mobile-responsive, and usable on low-bandwidth connections

### 1.2 Actors

| Role | Primary Goals |
|---|---|
| **Trainee** | Build profile, enroll in courses, learn, get assessed, get certified, give feedback |
| **Trainer** | Manage teaching profile, create content & assessments, track trainee performance |
| **Admin** | Approve users, manage roles, monitor org-wide metrics, publish announcements, oversee competency mapping |

---

## 2. Feature Specification

### 2.1 Authentication & Authorization
- Email/password signup with email verification (OTP or verification link)
- Role selection at signup (Trainee/Trainer) — **Admin accounts are never self-registered**; created by existing Admins or seeded
- Login with JWT access token (short-lived, ~15 min) + refresh token (long-lived, ~7 days, httpOnly cookie)
- Password reset via email token
- Account approval gate: new Trainer/Trainee accounts are `pending` until an Admin approves — required by the PS ("user approval and role management")
- Role-based access control (RBAC) middleware on every protected route
- Optional: SSO/OAuth (Google Workspace or org SSO) for real deployment credibility

### 2.2 Trainee Module
- **Profile builder**: qualifications, work experience, skills (tagged, multi-select from a controlled taxonomy + free text), interests, certificates (uploaded as files or entered as structured records with issuing body + date)
- **Course catalog**: browse/search/filter by subject, trainer, difficulty, duration
- **Enrollment**: self-enroll (open courses) or admin-assigned (mandatory courses)
- **Learning resources**: stream/download videos, PDFs, slide decks per enrolled course
- **MCQ assessment engine**:
  - Subject-wise question banks
  - Trainers set a per-quiz passing percentage; populated quizzes appear in the course page, and enrolled trainees can answer selectable MCQ options and receive an automatically calculated score
  - Timed attempts, configurable attempt limits
  - Auto-grading with instant/deferred result release (trainer's choice)
  - Progress tracking per course
- **Certificates**: auto-generated PDF certificate on course completion only when the assessment score meets the trainer's passing threshold
- **Feedback**: rate courses and trainers post-completion (star rating + comments)
- **Dashboard**: enrolled courses, progress bars, upcoming deadlines, certificates earned

### 2.3 Trainer Module
- **Profile management**: bio, subject-matter expertise tags (this feeds the competency engine), qualifications, years of experience
- **Course/questionnaire creation**: create courses, attach question banks, set deadlines and passing criteria
- **Content upload**: videos, PPTs, PDFs, docs → stored in a "Trainer Library" visible to enrolled trainees
- **Trainee monitoring**: view enrollment lists, completion %, quiz scores, time spent
- **Performance dashboard**: aggregate stats per course (avg score, pass rate, drop-off points)
- **Feedback view**: read trainee feedback on their courses

### 2.4 Admin Module
- **User management**: approve/reject signups, assign/change roles, deactivate accounts
- **Competency mapping engine**: maintain a subject/skill taxonomy; auto-suggest or manually assign trainers to courses/subjects based on tagged competency overlap
- **Course oversight**: view/edit/archive any course
- **Dashboards**:
  - Enrollment trends over time
  - Certification issuance stats
  - Assessment pass/fail rates by course/subject
  - Trainer performance leaderboard
  - Active vs inactive user counts
- **Content publishing**: post announcements, achievements, newly added courses to the public/logged-in homepage
- **Audit log**: who approved whom, who edited what — important for government-context credibility

### 2.5 Cross-cutting Features
- Notifications (in-app + email) for deadlines, approvals, new content
- Global search (courses, trainers, resources)
- Responsive design — mobile, tablet, desktop
- Accessibility basics (WCAG-aware: alt text, keyboard nav, contrast)
- Multi-device session handling

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                     │
│         React/Next.js SPA — Trainee/Trainer/Admin UI      │
└───────────────────────────┬───────────────────────────────┘
                             │ HTTPS (REST/JSON, JWT auth)
┌───────────────────────────▼───────────────────────────────┐
│                    API GATEWAY / BACKEND                   │
│   Node.js (Express/NestJS) or Django REST Framework         │
│  ┌───────────┬────────────┬─────────────┬────────────┐   │
│  │  Auth Svc │ Course Svc │ Assessment  │ Competency  │   │
│  │           │            │  Engine     │  Matching   │   │
│  └───────────┴────────────┴─────────────┴────────────┘   │
└───────┬────────────────┬────────────────┬─────────────────┘
        │                │                │
┌───────▼──────┐  ┌──────▼───────┐  ┌─────▼─────────┐
│ PostgreSQL   │  │ Object Store │  │ Redis (cache/  │
│ (primary DB) │  │ (S3-compat)  │  │  sessions/     │
│              │  │ videos/docs  │  │  queues)       │
└──────────────┘  └──────────────┘  └────────────────┘
```

**Pattern:** Modular monolith to start (faster to build for a hackathon/MVP), structured so each module (auth, courses, assessments, competency) could later split into microservices if scaling demands it.

---

## 4. Tech Stack (Recommended)

### 4.1 Frontend
| Layer | Choice | Why |
|---|---|---|
| Framework | **React + Vite** (or Next.js if SEO/homepage matters) | Fast dev, huge ecosystem |
| Styling | **Tailwind CSS** | Rapid, consistent, responsive by default |
| State management | **React Query** (server state) + **Zustand/Redux Toolkit** (client state) | Clean separation of cache vs UI state |
| Forms | React Hook Form + Zod validation | Type-safe, less boilerplate |
| Charts (Admin dashboards) | Recharts or Chart.js | Enrollment/assessment analytics |
| Rich content viewer | React PDF viewer, video.js for lecture playback | |

### 4.2 Backend
| Layer | Choice | Why |
|---|---|---|
| Runtime/Framework | **Node.js + NestJS** (or Express) — alt: **Django REST Framework** | NestJS gives structured modules/DI matching your Auth/Course/Assessment/Competency split; Django gives you an admin panel almost free |
| API style | REST (OpenAPI/Swagger documented) | Simpler for a hackathon judge/demo than GraphQL |
| Auth | JWT (access + refresh) via Passport.js or Django SimpleJWT | Stateless, scalable |
| Background jobs | BullMQ (Node) or Celery (Django) + Redis | Certificate generation, email notifications, deadline reminders |
| File handling | Multer/S3 SDK (Node) or django-storages | Direct-to-S3 uploads via signed URLs |

### 4.3 Database
| Layer | Choice | Why |
|---|---|---|
| Primary DB | **PostgreSQL** | Relational integrity for users/roles/enrollments/competencies; strong JSONB support for flexible tags |
| Cache/Session/Queue | **Redis** | Session store, rate limiting, job queue backend |
| Object storage | **AWS S3 / MinIO (self-hosted alt)** | Videos, PPTs, PDFs, certificates |
| Search (optional, v2) | **PostgreSQL full-text search** → later **Elasticsearch/Meilisearch** if catalog grows | Course/resource search |

### 4.4 Infrastructure & DevOps
| Layer | Choice |
|---|---|
| Containerization | Docker + docker-compose (local), Kubernetes (production scale) |
| CI/CD | GitHub Actions |
| Hosting (demo) | Render / Railway / Vercel (frontend) |
| Hosting (production/govt-scale) | AWS (EC2/ECS + RDS + S3) or Azure equivalents (NIC/MeghRaj cloud for actual govt deployment) |
| Monitoring | Sentry (errors), Prometheus + Grafana (metrics) |
| Email | AWS SES / SendGrid |

### 4.5 Security
- Passwords hashed with bcrypt/argon2
- Rate limiting on auth endpoints
- Input validation on every endpoint (Zod/class-validator)
- Signed, time-limited URLs for file access (no public buckets)
- HTTPS everywhere, HSTS
- Role checks at both route and query level (never trust client-sent role)
- Audit logging for admin actions

---

## 5. Database Schema (Core Tables)

```sql
-- USERS & AUTH
users (
  id UUID PK,
  name VARCHAR,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  role ENUM('trainee','trainer','admin'),
  status ENUM('pending','approved','rejected','suspended'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- PROFILES
trainee_profiles (
  id UUID PK,
  user_id UUID FK -> users.id,
  qualifications JSONB,
  work_experience JSONB,
  interests TEXT[],
  bio TEXT
)

trainer_profiles (
  id UUID PK,
  user_id UUID FK -> users.id,
  bio TEXT,
  years_experience INT,
  qualifications JSONB
)

skills (
  id UUID PK,
  name VARCHAR UNIQUE,
  category VARCHAR         -- e.g. "Technical", "Domain", "Soft Skill"
)

user_skills (              -- links trainees AND trainers to skills (competency taxonomy)
  id UUID PK,
  user_id UUID FK -> users.id,
  skill_id UUID FK -> skills.id,
  proficiency_level ENUM('beginner','intermediate','advanced','expert'),
  source ENUM('self_declared','certified','assessed')
)

certificates (
  id UUID PK,
  user_id UUID FK -> users.id,
  title VARCHAR,
  issuing_body VARCHAR,
  issue_date DATE,
  file_url VARCHAR,
  course_id UUID FK -> courses.id NULL   -- null if external cert
)

-- COURSES
courses (
  id UUID PK,
  title VARCHAR,
  description TEXT,
  trainer_id UUID FK -> users.id,
  subject_skill_id UUID FK -> skills.id,  -- primary subject tag
  difficulty ENUM('beginner','intermediate','advanced'),
  status ENUM('draft','published','archived'),
  created_at TIMESTAMP
)

course_resources (
  id UUID PK,
  course_id UUID FK -> courses.id,
  type ENUM('video','pdf','ppt','doc','link'),
  file_url VARCHAR,
  title VARCHAR,
  uploaded_at TIMESTAMP
)

enrollments (
  id UUID PK,
  course_id UUID FK -> courses.id,
  trainee_id UUID FK -> users.id,
  enrolled_at TIMESTAMP,
  status ENUM('active','completed','dropped'),
  progress_percent INT
)

-- ASSESSMENTS
question_banks (
  id UUID PK,
  course_id UUID FK -> courses.id,
  subject_skill_id UUID FK -> skills.id,
  title VARCHAR,
  deadline TIMESTAMP,
  pass_percentage INT,
  time_limit_minutes INT
)

questions (
  id UUID PK,
  question_bank_id UUID FK -> question_banks.id,
  text TEXT,
  options JSONB,           -- [{id, text}, ...]
  correct_option_id VARCHAR,
  explanation TEXT
)

assessment_attempts (
  id UUID PK,
  question_bank_id UUID FK -> question_banks.id,
  trainee_id UUID FK -> users.id,
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  score INT,
  passed BOOLEAN,
  answers JSONB              -- {question_id: selected_option_id}
)

-- FEEDBACK
feedback (
  id UUID PK,
  course_id UUID FK -> courses.id,
  trainee_id UUID FK -> users.id,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP
)

-- ADMIN / PLATFORM
announcements (
  id UUID PK,
  title VARCHAR,
  body TEXT,
  type ENUM('announcement','achievement','new_content'),
  published_by UUID FK -> users.id,
  published_at TIMESTAMP
)

audit_logs (
  id UUID PK,
  actor_id UUID FK -> users.id,
  action VARCHAR,           -- e.g. "approved_user", "assigned_trainer"
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP
)
```

**Key relational design notes:**
- `user_skills` is the shared table that powers **both** trainee skill profiles **and** trainer competency tags — this is what the matching engine queries.
- `courses.subject_skill_id` ties every course to the same skill taxonomy, so trainer-course matching is a direct join, not fuzzy text matching.

---

## 6. Competency Mapping / Trainer-Matching Algorithm

**Goal:** Given a course's subject skill(s), rank trainers by fit.

**V1 (deliverable in hackathon timeframe) — weighted scoring, no ML:**

```
score(trainer, course) =
    (trainer_proficiency_level_weight)       × 0.5
  + (years_experience_normalized)            × 0.2
  + (avg_past_course_rating_for_this_skill)  × 0.2
  + (number_of_prior_courses_taught_in_skill)× 0.1
```

- `trainer_proficiency_level_weight`: beginner=0.25, intermediate=0.5, advanced=0.75, expert=1.0
- `years_experience_normalized`: min(years/10, 1.0)
- `avg_past_course_rating_for_this_skill`: from `feedback` table, normalized 0–1
- `number_of_prior_courses_taught_in_skill`: normalized against max across trainers

Admin sees a ranked list of trainers per subject when creating/assigning a course, with the option to override manually. This satisfies the PS requirement without needing a trained ML model — defensible, explainable, and fast to build.

**V2 (future/production):** Replace static weights with a learned model (e.g., logistic regression or gradient boosting) trained on historical assignment outcomes (completion rates, trainee satisfaction) once enough data exists.

---

## 7. API Design (Representative Endpoints)

```
AUTH
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/verify-email

USERS
GET    /api/users/me
PATCH  /api/users/me/profile
GET    /api/admin/users?status=pending
PATCH  /api/admin/users/:id/approve
PATCH  /api/admin/users/:id/role

SKILLS / COMPETENCY
GET    /api/skills
POST   /api/users/me/skills
GET    /api/admin/competency/match?course_id=xxx   -- returns ranked trainers

COURSES
GET    /api/courses?search=&skill=&difficulty=
POST   /api/courses                 (trainer)
GET    /api/courses/:id
PATCH  /api/courses/:id             (trainer/admin)
POST   /api/courses/:id/enroll      (trainee)
GET    /api/courses/:id/resources
POST   /api/courses/:id/resources   (trainer, multipart upload)

ASSESSMENTS
POST   /api/question-banks          (trainer)
POST   /api/question-banks/:id/questions
POST   /api/attempts/start          (trainee)
POST   /api/attempts/:id/submit
GET    /api/attempts/:id/result

FEEDBACK
POST   /api/courses/:id/feedback

ADMIN DASHBOARD
GET    /api/admin/dashboard/enrollments
GET    /api/admin/dashboard/certifications
GET    /api/admin/dashboard/assessments
GET    /api/admin/dashboard/participation

ANNOUNCEMENTS
GET    /api/announcements
POST   /api/admin/announcements
```

---

## 8. Frontend Route/Page Structure

```
/                         → public homepage (announcements, achievements, featured courses)
/login  /signup           → auth
/pending-approval         → shown to unapproved users

/trainee/dashboard
/trainee/profile
/trainee/courses                 → catalog + search/filter
/trainee/courses/:id             → detail, resources, enroll
/trainee/courses/:id/assessment/:qbId
/trainee/certificates
/trainee/feedback/:courseId

/trainer/dashboard
/trainer/profile
/trainer/courses                 → manage own courses
/trainer/courses/new
/trainer/courses/:id/questions
/trainer/courses/:id/trainees    → monitor performance
/trainer/library                 → upload/manage resources

/admin/dashboard                 → charts: enrollments, certs, assessments, participation
/admin/users                     → approve/reject, role mgmt
/admin/competency-mapping        → view/assign trainers to subjects
/admin/announcements
/admin/audit-log
```

---

## 9. Development Roadmap (Suggested Sprints)

**Phase 1 — Foundation (Days 1–2)**
- Repo setup, Docker Compose (Postgres + Redis + backend + frontend)
- Auth module (signup/login/JWT/RBAC/approval flow)
- Base DB schema migrated

**Phase 2 — Core Modules (Days 3–5)**
- Trainee & Trainer profile CRUD + skill tagging
- Course creation, resource upload, enrollment flow
- MCQ engine (question bank CRUD, attempt flow, auto-grading)

**Phase 3 — Admin & Competency Engine (Days 6–7)**
- Admin approval/role management UI
- Competency scoring algorithm + matching UI
- Admin dashboards (charts wired to real queries)

**Phase 4 — Polish (Days 8–9)**
- Homepage announcements/achievements
- Certificates (PDF generation on completion)
- Feedback flow
- Responsive pass + accessibility pass

**Phase 5 — Demo Readiness (Day 10)**
- Seed realistic demo data (users, courses, attempts)
- Deploy to Render/Railway/Vercel
- Prepare pitch: problem → competency-matching differentiator → live demo → scalability story

---

## 10. Advanced & Differentiating Features (Smart Education Add-Ons)

These are optional-but-powerful modules layered on top of the core platform. They're grouped by theme so you can pick a realistic subset for a hackathon MVP (marked **[MVP-feasible]**) versus a "future roadmap" pitch item (marked **[Roadmap]**) — judges respond well to seeing both a working slice *and* a credible larger vision.

### 10.1 AI & Personalization

| Feature | What it does | Feasibility |
|---|---|---|
| **AI Tutor / Chatbot Assistant** | Course-aware assistant available to enrolled trainees on course detail pages; answers from course descriptions and extracted question-bank notes, using Gemini when configured and clearly surfaced note-based fallback otherwise | **[Implemented]** — configure `GEMINI_API_KEY` for LLM responses |
| **Adaptive learning paths** | Reorders/resequences modules per trainee based on quiz performance — struggling learners get remedial content inserted automatically | **[MVP-feasible]** simple rule-based version; **[Roadmap]** for full ML-driven version |
| **Auto-generated quiz questions** | Trainers generate draft MCQs from PDF lecture notes or pasted text, review/edit/remove candidates, then publish them to a course question bank | **[Implemented]** — PDF text extraction, optional PDF.co OCR, Gemini generation, and local grounded fallback |
| **Auto-generated video transcripts & searchable captions** | Speech-to-text on uploaded lectures → searchable text, improves accessibility and SEO within the platform | **[MVP-feasible]** (Whisper API or similar) |
| **Predictive drop-off / at-risk learner alerts** | Flags trainees likely to disengage (based on login frequency, quiz scores, pace) so trainers/admins can intervene early | **[Roadmap]** — needs historical data to train on; V1 can be rule-based (e.g., "no login in 7 days + <50% progress") |
| **AI-generated personalized study plans** | Based on a trainee's declared career/skill goals + current competency gaps, auto-suggest a course sequence | **[MVP-feasible]** rule-based using the existing skill-gap data |

### 10.2 Assessment Innovation

| Feature | What it does | Feasibility |
|---|---|---|
| **Adaptive difficulty MCQs** | Question difficulty adjusts in real time based on the trainee's running accuracy (computerized adaptive testing, CAT-style) | **[MVP-feasible]** — simple IRT-lite: bump difficulty tier after N correct answers |
| **Anti-cheating safeguards** | Tab-switch/window-blur detection, single active session enforcement, randomized question order & option shuffling, time-boxed attempts | **[MVP-feasible]** |
| **AI-assisted proctoring (optional)** | Webcam snapshot sampling / face-presence check during high-stakes assessments | **[Roadmap]** — privacy-sensitive, needs consent flows |
| **Practical/scenario-based assessments** | Beyond MCQs: case-study submissions, short-answer with AI-assisted rubric grading (trainer confirms) | **[Roadmap]** |
| **Spaced-repetition revision mode** | After course completion, periodically resurface a few questions on the topic (Anki-style) to reinforce long-term retention | **[MVP-feasible]** — simple scheduling job |

### 10.3 Engagement & Gamification

| Feature | What it does | Feasibility |
|---|---|---|
| **Badges & achievement system** | Auto-award badges for milestones (first course completed, 5-course streak, top scorer in a subject) | **[MVP-feasible]** |
| **Leaderboards** | Subject-wise or org-wide ranking by points/completions — opt-in to avoid demotivating slower learners | **[MVP-feasible]** |
| **Points & streaks** | Daily-login/streak tracking, points for course completion, quiz performance, peer help | **[MVP-feasible]** |
| **Microlearning mode** | Break long courses into 5–10 minute bite-sized modules with its own progress tracking — proven to improve completion rates | **[MVP-feasible]** — content modeling choice, not new infra |
| **Peer-to-peer discussion forums** | Per-course Q&A/discussion threads, upvoting, trainer can pin verified answers | **[MVP-feasible]** |
| **Study groups / cohort learning** | Trainees can form or get auto-grouped into cohorts for a course, with shared milestones | **[Roadmap]** |

### 10.4 Trust, Verification & Compliance (high-value for a government PS)

| Feature | What it does | Feasibility |
|---|---|---|
| **Blockchain/hash-verifiable certificates** | Each issued certificate gets a content hash anchored on-chain (or a verifiable digital signature) so third parties can validate authenticity via a public verify link | **[Roadmap]**, but a **[MVP-feasible]** simplified version: signed PDF + unique verification URL/QR code is enough for a demo |
| **Open Badges (1EdTech) standard support** | Issue certificates/badges in the interoperable Open Badges format so they're portable to LinkedIn, DigiLocker, etc. | **[Roadmap]** |
| **DigiLocker integration** | For an Indian government platform, letting trainees fetch/store certificates directly in DigiLocker is a strong, realistic differentiator | **[Roadmap]** — mention in pitch even if not built |
| **NCrF (National Credit Framework) alignment** | Map course completions to India's National Credit Framework credit points — very relevant since this is a central ministry PS | **[Roadmap]** — strong pitch talking point |
| **Full audit trail & compliance dashboard** | Already in core spec (Section 2.4) — extend with exportable compliance reports (who completed mandatory training, by when) | **[MVP-feasible]** |

### 10.5 Accessibility & Inclusion (India-specific, strong for MoES/government judging)

| Feature | What it does | Feasibility |
|---|---|---|
| **Multilingual UI & content** | Interface + course content in Hindi and regional languages (i18n framework + AI-assisted translation of trainer content) | **[MVP-feasible]** UI i18n; **[Roadmap]** for full content translation |
| **Offline-first / PWA mode** | Service-worker caching for downloaded resources, sync-on-reconnect — critical for field staff at remote MoES units (IMD stations, coastal offices) with poor connectivity | **[MVP-feasible]** as a PWA with basic offline resource caching |
| **Low-bandwidth adaptive video streaming** | Auto-quality-adjusting video (HLS/DASH) so lectures still play on 2G/3G | **[MVP-feasible]** via existing HLS tooling (e.g., Mux, or self-hosted ffmpeg pipeline) |
| **Voice-based navigation / screen-reader support** | WCAG-compliant markup, ARIA labels, keyboard-only navigation | **[MVP-feasible]** — design discipline, not new infra |
| **Text-to-speech for course content** | Lets trainees listen to written material — useful for accessibility and multitasking learners | **[MVP-feasible]** (browser TTS API or a backend TTS service) |

### 10.6 Analytics & Organizational Intelligence

| Feature | What it does | Feasibility |
|---|---|---|
| **Skill-gap heatmaps** | Org-wide visualization of which competencies are strong vs. weak across departments — feeds directly into training planning | **[MVP-feasible]** — aggregate query over `user_skills` + `assessment_attempts` |
| **Trainer effectiveness scoring** | Beyond raw ratings: correlate a trainer's courses with actual trainee competency improvement (pre/post skill level) | **[Roadmap]** |
| **Sentiment analysis on feedback** | Auto-tag open-text feedback as positive/neutral/negative and surface recurring themes to admins | **[MVP-feasible]** via a simple sentiment API/library |
| **ROI/impact dashboard** | Ties training completion to measurable org outcomes (e.g., certification density per department over time) | **[Roadmap]** |

### 10.7 What to actually pitch as your "unique" hook

For a hackathon demo, don't try to build all of these — pick **2–3 headline differentiators** that are both demo-able and memorable:

1. **Competency-matching engine** (already in core spec) — the structural differentiator
2. **AI-assisted content authoring** (auto-generate quiz questions from uploaded trainer material) — high "wow factor" in a live demo, realistic to build in hackathon time
3. **Offline-first / low-bandwidth PWA mode** — directly answers MoES's real deployment context (field stations, coastal/remote offices) and shows you understood the actual users, not just the feature list

Everything else in this section is fair game to list on a "Future Roadmap" slide to show product depth without overcommitting on build time.

---

## 11. Suggested Repo Structure

```
capacity-connect/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/ (or app/ for Next.js)
│   │   ├── hooks/
│   │   ├── services/        (API clients)
│   │   ├── store/            (Zustand/Redux)
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── assessments/
│   │   │   ├── competency/
│   │   │   ├── announcements/
│   │   │   └── admin/
│   │   ├── common/ (guards, decorators, interceptors)
│   │   └── main.ts
│   └── package.json
├── docker-compose.yml
└── docs/
    └── this file
```

---

## 12. Judging/Deployment Notes Specific to This PS

- MoES context suggests real usage by field staff (IMD, NCS, INCOIS units) — emphasize **low-bandwidth resilience** (compressed video, resumable uploads) in your pitch.
- Government evaluators weigh **security and auditability** heavily — the audit log and approval-gated signup aren't optional polish, they're scoring criteria.
- The **competency-matching engine** is your most defensible differentiator versus generic LMS clones other teams will submit — lead your demo with it.
