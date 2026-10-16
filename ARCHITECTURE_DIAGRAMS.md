# SyllabIQ Certificate System - Architecture & Flow Diagrams

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ Certificate  │  │ Notification │  │ Share Modal      │       │
│  │ Card         │  │ Center       │  │                  │       │
│  └──────────────┘  └──────────────┘  └──────────────────┘       │
│         ▲                 ▲                    ▲                  │
│         └─────────────────┼────────────────────┘                  │
│                           │                                       │
│    ┌──────────────────────┴────────────────────────┐            │
│    │   React Query Hooks (certificates.hook.ts)   │            │
│    └──────────────────────┬────────────────────────┘            │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │ API Calls (JSON)
                            │ over HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Controllers                             │   │
│  │  ┌────────────────┐      ┌─────────────────┐           │   │
│  │  │ Certificates   │      │ Notifications   │           │   │
│  │  │ Controller     │      │ Controller      │           │   │
│  │  └────────┬───────┘      └────────┬────────┘           │   │
│  └───────────┼──────────────────────┼──────────────────────┘   │
│              │                      │                          │
│  ┌───────────▼──────────┐  ┌────────▼───────────┐             │
│  │ Certificates Service │  │ Notifications     │             │
│  │                      │  │ Service           │             │
│  │ • generateCertificate│  │                   │             │
│  │ • getCertificate     │  │ • createNotif     │             │
│  │ • downloadPdf        │  │ • getNotif        │             │
│  │ • createShareLink    │  │ • markAsRead      │             │
│  │ • verifyCertificate  │  └────────┬──────────┘             │
│  │ • revokeCertificate  │           │                        │
│  └──────────┬───────────┘           │                        │
│             │                       │                        │
│  ┌──────────▼───────────┐           │                        │
│  │ PDF Generator        │           │                        │
│  │ Service (PDFKit)     │           │                        │
│  │                      │           │                        │
│  │ • generatePdf()      │           │                        │
│  │ • drawTemplate()     │           │                        │
│  │ • formatDate()       │           │                        │
│  └────────┬─────────────┘           │                        │
│           │                         │                        │
└───────────┼─────────────────────────┼────────────────────────┘
            │                         │
            ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌────────────────────┐     ┌──────────────────┐               │
│  │   PostgreSQL       │     │   Storage        │               │
│  │                    │     │   (S3/Local)     │               │
│  │ • certificates     │────▶│                  │               │
│  │ • cert_shares      │     │ certificate_xxx  │               │
│  │ • notifications    │     │ .pdf files       │               │
│  │ • users            │     └──────────────────┘               │
│  │ • courses          │                                         │
│  │ • assessments      │     ┌──────────────────┐               │
│  └────────────────────┘     │   Redis          │               │
│                             │   (Cache)        │               │
│                             │                  │               │
│                             │ • Sessions       │               │
│                             │ • Notifications  │               │
│                             └──────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Certificate Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  STUDENT TAKES ASSESSMENT                                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Student answers questions                             │   │
│  │ 2. Clicks "Submit Assessment"                            │   │
│  └────────────┬─────────────────────────────────────────────┘   │
│               │                                                  │
│               ▼                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AssessmentsService.submitAttempt()                       │   │
│  │ • Calculate score                                        │   │
│  │ • Check if score >= pass_percentage                      │   │
│  └────────────┬──────────────────────────────────────────┬──┘   │
│               │                                          │      │
│         FAIL  │  PASS                                    │      │
│               ▼  ▼                                        │      │
│          NO  YES                                         │      │
│          │   │                                           │      │
│   ┌──────▼───▼──────────────────────────────────────┐   │      │
│   │ CertificatesService.                            │   │      │
│   │ generateCertificateForPassing()                 │   │      │
│   │                                                 │   │      │
│   │ 1. Fetch attempt details                        │   │      │
│   │    • Student name                               │   │      │
│   │    • Course name                                │   │      │
│   │    • Teacher name                               │   │      │
│   │    • Score                                      │   │      │
│   │                                                 │   │      │
│   │ 2. Generate unique certificate code             │   │      │
│   │    CERT-MOES-2026-XXXXXX                        │   │      │
│   │                                                 │   │      │
│   │ 3. Create PDF using PDFGenerator                │   │      │
│   │    • Professional template                      │   │      │
│   │    • Include all details                        │   │      │
│   │                                                 │   │      │
│   │ 4. Upload PDF to storage                        │   │      │
│   │    /certificates/{user_id}/{code}.pdf           │   │      │
│   │                                                 │   │      │
│   │ 5. Insert certificate record                    │   │      │
│   │    INSERT INTO certificates (...)               │   │      │
│   │                                                 │   │      │
│   │ 6. Create notification                          │   │      │
│   │    "Certificate Earned! 🎓"                     │   │      │
│   └──────┬──────────────────────────────────────────┘   │      │
│          │                                              │      │
│          └──────────────────────────────────────────────┘      │
│                       ▼                                         │
│          ┌────────────────────────────┐                        │
│          │ ✅ CERTIFICATE GENERATED   │                        │
│          │                            │                        │
│          │ • Database record created  │                        │
│          │ • PDF stored securely      │                        │
│          │ • Notification sent        │                        │
│          │ • Profile updated          │                        │
│          └────────────────────────────┘                        │
│                       ▲                                         │
│                       │                                         │
│          FRONTEND NOTIFIED → 🎓 BADGE SHOWN                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Certificate Sharing & Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STUDENT CREATES SHARE LINK                                     │
│                                                                  │
│  1. Opens certificate                                           │
│  2. Clicks "Share" button                                       │
│  3. Dialog appears:                                             │
│     ☐ Make public                                               │
│     📅 Expiration date                                          │
│  4. Clicks "Create Link"                                        │
│                                                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Backend generates: │
        │ • Unique token     │
        │ • Stores in DB     │
        │ • Sets expiration  │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────────────────────┐
        │ Share URL generated:               │
        │ https://syllabiq.gov.in/           │
        │ certificates/share/abc123def456    │
        └────────┬───────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │ Student copies link and:   │
        │ • Pastes to email          │
        │ • Posts on LinkedIn        │
        │ • Adds to resume           │
        │ • Shares with network      │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │ ANYONE CAN VIEW (No login needed)   │
        │                                     │
        │ 1. Person clicks link               │
        │ 2. Backend verifies token           │
        │ 3. Checks expiration                │
        │ 4. Returns certificate details      │
        │ 5. Frontend displays:                │
        │    • Certificate details            │
        │    • Authenticity verified ✓        │
        │    • Download option                │
        │    • Verification link              │
        └────────┬────────────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────┐
        │ PUBLIC VERIFICATION ENDPOINT     │
        │                                  │
        │ GET /api/certificates/verify/    │
        │     CERT-MOES-2026-XXXXX         │
        │                                  │
        │ Returns:                         │
        │ ✓ Certificate valid              │
        │ ✓ Student name                   │
        │ ✓ Issued date                    │
        │ ✓ Not revoked                    │
        │                                  │
        │ OR                               │
        │ ✗ Revoked (reason shown)         │
        │ ✗ Not found                      │
        └──────────────────────────────────┘
```

---

## 4. Role-Based Access Control

```
┌──────────────────────────────────────────────────────────────┐
│                   CERTIFICATE ACCESS MATRIX                  │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Action       │ Student      │ Trainer      │ Admin          │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ View own     │ ✅ Yes       │ N/A          │ N/A            │
│ View issued  │ N/A          │ ✅ Own only  │ ✅ All         │
│ Download PDF │ ✅ Own only  │ ✅ Own       │ ✅ Any         │
│ Create share │ ✅ Own only  │ ✅ Own       │ ✅ Any         │
│ Revoke       │ ❌ No        │ ✅ Own only  │ ✅ Any         │
│ View stats   │ ❌ No        │ ⚠️ Own only  │ ✅ System-wide │
│ Verify       │ ✅ Public    │ ✅ Public    │ ✅ Public      │
└──────────────┴──────────────┴──────────────┴────────────────┘

IMPLEMENTATION:
1. JWT token contains user.role
2. @UseGuards(JwtAuthGuard, RolesGuard)
3. @Roles(UserRole.TRAINEE, UserRole.TRAINER)
4. Service methods validate ownership
5. Unauthorized returns 403 Forbidden
```

---

## 5. Database Schema Relationships

```
┌──────────────────┐
│     users        │
├──────────────────┤
│ id (PK)          │
│ name             │
│ email            │
│ role             │
│ status           │
└────┬──────────────┘
     │
     ├──────────────────────────┬────────────────────────┐
     │                          │                        │
     ▼                          ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  certificates    │    │ notifications    │    │ courses          │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ user_id (FK)     │◀───│ user_id (FK)     │    │ id (PK)          │
│ trainer_id (FK)  │    │ type             │    │ trainer_id (FK)  │
│ course_id (FK)───┼────┤ reference_id     │    │ subject_skill_id │
│ certificate_code │    │ is_read          │    └──────────────────┘
│ pdf_file_url     │    └──────────────────┘           │
│ is_revoked       │                                    │
└────┬─────────────┘                                    │
     │                                                  │
     ▼                                                  ▼
┌──────────────────┐                         ┌──────────────────┐
│ certificate_     │                         │ question_banks   │
│ shares           │                         ├──────────────────┤
├──────────────────┤                         │ id (PK)          │
│ id (PK)          │                         │ course_id (FK)   │
│ certificate_id   │                         │ pass_percentage  │
│ (FK)             │                         │ time_limit_min   │
│ share_token      │                         └────┬─────────────┘
│ is_public        │                              │
│ expires_at       │                              ▼
└──────────────────┘                    ┌──────────────────────┐
                                        │ assessment_attempts  │
                                        ├──────────────────────┤
                                        │ id (PK)              │
                                        │ question_bank_id(FK) │
                                        │ trainee_id (FK)      │
                                        │ score                │
                                        │ passed               │
                                        │ answers              │
                                        └──────────────────────┘
```

---

## 6. Data Flow: Assessment → Notification → View

```
STEP 1: ASSESSMENT SUBMISSION
┌─────────────────────────────┐
│  POST /api/attempts/submit  │
│                             │
│  {                          │
│    answers: {               │
│      q1: "option_a",        │
│      q2: "option_b"         │
│    }                        │
│  }                          │
└──────────────┬──────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ AssessmentsService.submitAttempt()               │
│  → Calculate score: 85%                          │
│  → Check pass: 85% >= 70% ? YES                  │
│  → Mark enrollment COMPLETED                     │
│  → Call CertificatesService.generateCert...()   │
└──────────────┬───────────────────────────────────┘
               │
STEP 2: CERTIFICATE GENERATION
┌──────────────────────────────────────────────────┐
│ CertificatesService.generateCertificateFor...()  │
│  → Generate PDF with student details             │
│  → Upload to S3: /certificates/uuid/CODE.pdf    │
│  → Create DB record:                             │
│     INSERT INTO certificates (...)               │
│  → Call NotificationsService.createNotif...()   │
└──────────────┬───────────────────────────────────┘
               │
STEP 3: NOTIFICATION CREATED
┌──────────────────────────────────────────────────┐
│ NotificationsService.createNotification()        │
│  INSERT INTO notifications (...)                 │
│  {                                               │
│    user_id: 'uuid-123',                          │
│    type: 'certificate_issued',                   │
│    title: 'Certificate Earned! 🎓',             │
│    message: 'You passed "Course Name"',         │
│    reference_id: 'cert-uuid',                    │
│    action_url: '/trainee/certificates/uuid',    │
│    is_read: false                                │
│  }                                               │
└──────────────┬───────────────────────────────────┘
               │
STEP 4: FRONTEND RECEIVES RESPONSE
┌──────────────────────────────────────────────────┐
│  Response: 200 OK                                │
│  {                                               │
│    attemptId: 'attempt-123',                     │
│    score: 85,                                    │
│    passed: true,                                 │
│    certificate: {                                │
│      id: 'cert-uuid',                            │
│      certificateCode: 'CERT-MOES-2026-ABC123',  │
│      pdfFileUrl: 's3://bucket/path/cert.pdf'   │
│    }                                             │
│  }                                               │
└──────────────┬───────────────────────────────────┘
               │
STEP 5: FRONTEND UI UPDATES
┌──────────────────────────────────────────────────┐
│  ✅ Shows result: "You Passed!"                  │
│  ✅ Notification bell badge: "1"                 │
│  ✅ Notification toaster: "Certificate Earned!" │
│  ✅ Buttons: Download PDF, Share, View           │
└──────────────┬───────────────────────────────────┘
               │
STEP 6: USER ACTIONS
┌──────────────────────────────────────────────────┐
│  Option 1: Download PDF                          │
│  GET /api/certificates/:id/download              │
│  → Browser downloads certificate.pdf             │
│                                                  │
│  Option 2: View Details                          │
│  Navigate to /trainee/certificates/:id           │
│                                                  │
│  Option 3: Create Share Link                     │
│  POST /api/certificates/:id/share                │
│  → Get sharable URL                              │
│  → Copy to clipboard                             │
│  → Share with others                             │
└──────────────────────────────────────────────────┘
```

---

## 7. Notification Center Flow

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR                                             │
│                                                     │
│  [...nav items...]  [🔔 BELL with badge "3"]      │
│                          │                         │
│                          ▼ (Click)                  │
│                   ┌───────────────────┐            │
│                   │  DROPDOWN OPENS   │            │
│                   └─────────┬─────────┘            │
└─────────────────────────────┼──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────┐
                    │  NOTIFICATION CENTER     │
                    ├──────────────────────────┤
                    │                          │
                    │  Title: Mark all read 🔗 │
                    │                          │
                    │ ┌──────────────────────┐ │
                    │ │ [Award Icon]         │ │
                    │ │ Certificate Earned!  │ │
                    │ │ You passed Course..  │ │
                    │ │ 2 seconds ago        │ │
                    │ │ [Blue - Unread]   ✕  │ │
                    │ └──────────────────────┘ │
                    │ ┌──────────────────────┐ │
                    │ │ [Check Icon]         │ │
                    │ │ Course Completed     │ │
                    │ │ You finished course  │ │
                    │ │ 1 minute ago         │ │
                    │ │ [White - Read]    ✕  │ │
                    │ └──────────────────────┘ │
                    │ ┌──────────────────────┐ │
                    │ │ [Alert Icon]         │ │
                    │ │ Enrollment Status    │ │
                    │ │ You are approved...  │ │
                    │ │ 1 hour ago           │ │
                    │ │ [White - Read]    ✕  │ │
                    │ └──────────────────────┘ │
                    │                          │
                    │  [View all →]            │
                    └──────────────────────────┘

INTERACTION:
1. Click notification → Navigate to certificate page
2. Click ✕ → Delete notification
3. Mark all read → All turn white
4. Click bell again → Close dropdown
5. Refetch every 30 seconds (configurable)
```

---

## 8. Certificate Revocation Process

```
TRAINER/ADMIN ACTION:
┌────────────────────────────┐
│ Views certificate          │
│ Notices fraudulent         │
│ Clicks "Revoke"            │
└──────────────┬─────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Modal appears:   │
        │                  │
        │ Why revoking?    │
        │ [Text input]     │
        │                  │
        │ [Cancel] [OK]    │
        └──────┬───────────┘
               │ (OK clicked)
               ▼
        ┌──────────────────────────────────┐
        │ PATCH /api/certificates/:id/     │
        │        revoke                    │
        │ {                                │
        │   reason: "Fraudulent attempt"   │
        │ }                                │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ CertificatesService.revoke...()  │
        │                                  │
        │ UPDATE certificates              │
        │ SET is_revoked = TRUE,           │
        │     revoked_at = NOW(),          │
        │     revocation_reason = 'reason' │
        │                                  │
        │ Response: {                      │
        │   id: 'cert-123',                │
        │   isRevoked: true,               │
        │   revokedAt: '2026-10-07...',    │
        │   revocationReason: '...'        │
        │ }                                │
        └──────────────┬───────────────────┘
                       │
EFFECTS:
├─ GET /certificates/:id → Shows "REVOKED"
├─ PDF Download → Still allowed (record intact)
├─ Verification endpoint → Shows revocation status
├─ Student notification → Optional email alert
└─ Admin audit log → Records who revoked and when
```

---

**All diagrams created with ASCII art for easy viewing in Markdown**

Last Updated: October 7, 2026

