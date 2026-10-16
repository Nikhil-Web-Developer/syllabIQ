# SyllabIQ Developer & Agent Instructions

This document specifies the technical architecture, coding standards, role models, and invariants for **SyllabIQ** (Digital Capacity Building & Learning Management Portal).

All AI agents and developers working on this codebase **MUST** consult and adhere to the master specification file:
👉 [capacity-connect-documentation.md](docs/capacity-connect-documentation.md)

---

## 1. Project Overview & Architecture

SyllabIQ is a multi-role LMS and Capacity Building platform designed for:
- **Trainee**: Builds profiles, browses course catalog, self-enrolls, takes MCQ assessments, downloads certificates, leaves course feedback.
- **Trainer**: Manages teaching bio & competency tags, authors courses, uploads learning resources, builds question banks, monitors trainee progress.
- **Admin**: Approves/rejects user registrations, oversees roles, manages skill taxonomies, runs competency-based trainer matching, monitors organizational metrics, manages announcements, and maintains audit logs.

### Key Architectural Invariants:
1. **Modular Monolith**:
   - Backend (`/backend`): Node.js + NestJS with modular feature boundaries (`auth`, `users`, `courses`, `assessments`, `competency`, `announcements`, `admin`).
   - Frontend (`/frontend`): React + Vite + TypeScript with Tailwind CSS, TanStack React Query, Zustand client store, and React Router v6.
2. **PostgreSQL as Primary DB**: Relational schemas with UUID primary keys and JSONB fields for unstructured metadata (qualifications, work experience, question options).
3. **Redis**: Session caching, rate limiting, and BullMQ queue backend.
4. **Approval-Gated Access**: New Trainee/Trainer signups default to status `pending` and cannot access protected dashboards until approved by an Admin.
5. **Single Shared Taxonomy**: `user_skills` powers both Trainee skill profiles and Trainer competency tags, enabling direct relational joins for the competency matching engine.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Node.js (v20+), NestJS (v10+), Express platform |
| **API Architecture** | REST with OpenAPI/Swagger documentation (`/api/docs`) |
| **Database & ORM** | PostgreSQL 16+ with raw SQL migrations and pg connection pooling |
| **Authentication** | JWT (Short-lived Access Token in headers + Refresh Token) & bcrypt password hashing |
| **Caching & Queues** | Redis 7+ via `ioredis` |
| **Frontend Framework** | React 18, Vite 5, TypeScript |
| **Styling** | Tailwind CSS v3, Lucide React icons, Inter font |
| **Client State & Cache** | TanStack React Query v5 (server cache) + Zustand (client auth/UI state) |
| **Routing** | React Router v6 with strict layout nesting and Role Guards |
| **Containerization** | Docker & Docker Compose |

---

## 3. Directory Layout

```
SyllabIQ/
├── backend/
│   ├── src/
│   │   ├── common/             # Global guards, decorators, interceptors, filters
│   │   ├── database/           # PostgreSQL connection & migrations (/migrations/*.sql)
│   │   ├── redis/              # Redis service & connection management
│   │   ├── modules/
│   │   │   ├── auth/           # Login, signup, refresh, JWT guards
│   │   │   ├── users/          # User profiles (trainee/trainer)
│   │   │   ├── courses/        # Courses, resources, enrollments
│   │   │   ├── assessments/    # Question banks, questions, attempts
│   │   │   ├── competency/     # Skills taxonomy & trainer-matching engine
│   │   │   ├── announcements/  # Announcements & platform updates
│   │   │   └── admin/          # Admin approvals, role management, analytics, audit log
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # AppLayout, Sidebar, Navbar, RoleRoute, ProtectedRoute
│   │   │   └── ui/             # Reusable UI components
│   │   ├── pages/
│   │   │   ├── auth/           # Login, Signup, PendingApproval
│   │   │   ├── public/         # HomePage
│   │   │   ├── trainee/        # Trainee dashboard, catalog, assessment, certs
│   │   │   ├── trainer/        # Trainer dashboard, course authoring, library
│   │   │   └── admin/          # Admin dashboard, user approvals, competency, audit
│   │   ├── services/           # Axios API client & endpoints
│   │   ├── store/              # Zustand authStore & app state
│   │   ├── types/              # TypeScript models & API interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml
└── docs/
    └── capacity-connect-documentation.md
```

---

## 4. Coding Conventions & Standards

1. **TypeScript Strict Mode**: All backend and frontend code must compile cleanly with `strict: true` and zero `any` types where possible.
2. **Feature-Module Encapsulation**: Keep controllers, services, DTOs, and entities co-located within their feature module.
3. **REST Naming Convention**: Adhere strictly to the endpoint paths defined in Section 7 of the documentation:
   - Prefix all backend routes with `/api`.
   - Resource plurals (`/api/courses`, `/api/skills`, `/api/announcements`).
   - Role-specific namespaces where applicable (`/api/admin/users`, `/api/admin/competency/match`).
4. **Security First**:
   - Always hash passwords with bcrypt (minimum 10 salt rounds).
   - Enforce `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin' | 'trainer' | 'trainee')` on protected routes.
   - Never trust client-sent user IDs; always extract `req.user.id` via `@CurrentUser()`.
5. **Database Consistency**: Use transactions for multi-step database mutations (e.g. creating question banks with initial questions, submitting assessment attempts with score calculations).
