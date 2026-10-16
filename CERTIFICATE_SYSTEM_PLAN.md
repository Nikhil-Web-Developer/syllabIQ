# SyllabIQ Certificate System Implementation Plan

## Overview
A comprehensive certificate system that automatically generates certificates when students pass assessments, tracks them in their profile, and allows viewing by teachers and admins.

---

## Requirements Summary

1. **Trigger**: Certificates auto-generate when a trainee **passes** (score ≥ pass_percentage)
2. **Format**: Both PDF download + shareable link with unique ID
3. **Sharing**: Profile view + separate "Certificates" tab
4. **Visibility**: Private to self, trainer, and admin only
5. **Notifications**: In-app notification when certificate is issued
6. **Certificate Contents**: Student name, course name, teacher name, date issued, unique certificate ID

---

## Technical Architecture

### 1. Database Schema Changes

#### Enhanced Certificates Table
```sql
certificates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  trainer_id UUID NOT NULL REFERENCES users(id),
  question_bank_id UUID NOT NULL REFERENCES question_banks(id),
  assessment_attempt_id UUID NOT NULL REFERENCES assessment_attempts(id),
  certificate_code VARCHAR(32) UNIQUE,  -- Unique shareable code
  score INT NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,  -- Optional expiration
  pdf_file_url VARCHAR,  -- S3/Storage path
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  revocation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Index for quick lookups
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_course_id ON certificates(course_id);
CREATE INDEX idx_certificates_certificate_code ON certificates(certificate_code);
```

#### Certificate Sharing (Optional - for future public sharing feature)
```sql
certificate_shares (
  id UUID PRIMARY KEY,
  certificate_id UUID NOT NULL REFERENCES certificates(id),
  share_token VARCHAR(64) UNIQUE,  -- Shareable URL token
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL
)
```

#### Notifications Table (if not existing)
```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR,  -- 'certificate_issued', 'course_passed', etc.
  title VARCHAR,
  message TEXT,
  reference_id UUID,  -- certificate_id in this case
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

## Backend Implementation

### 2. NestJS Modules & Services

#### Certificate Module Structure
```
backend/src/modules/certificates/
├── certificates.controller.ts       # API endpoints
├── certificates.service.ts          # Business logic
├── certificates.module.ts           # Module definition
├── dto/
│   ├── generate-certificate.dto.ts
│   ├── certificate-response.dto.ts
│   └── create-certificate.dto.ts
├── entities/
│   └── certificate.entity.ts
└── pdf/
    └── certificate-generator.service.ts  # PDF generation logic
```

### 3. Key Endpoints

```
POST   /api/certificates/generate          (Internal - triggered by assessment)
GET    /api/certificates                   (Trainee - list own certs)
GET    /api/certificates/:id               (Trainee/Trainer/Admin - view detail)
GET    /api/certificates/:id/download      (Trainee/Trainer/Admin - download PDF)
GET    /api/certificates/verify/:code      (Public - verify certificate)
GET    /api/certificates/share/:shareToken (Public - view shared certificate)
PATCH  /api/certificates/:id/revoke        (Admin/Trainer - revoke certificate)
GET    /api/trainee/certificates           (Trainee - list own in profile)
GET    /api/trainer/certificates           (Trainer - list issued certificates)
GET    /api/admin/certificates             (Admin - all certificates)
```

### 4. Certificate Generation Flow

**When assessment is submitted:**
1. AssessmentsService evaluates answers
2. If passed (score ≥ pass_percentage):
   - CertificatesService.generateCertificate() is called
   - PDF is generated using PDFKit or similar
   - Certificate record created in DB
   - PDF stored in S3/storage
   - In-app notification created
3. If failed:
   - Certificate NOT created
   - Optional: consolation notification/retry prompt

### 5. PDF Generation

**Using PDFKit library**:
- Template with placeholder text for: Student Name, Course Name, Teacher Name, Issue Date, Certificate Code
- Professional certificate design with:
  - Organization logo/header
  - Certificate title
  - Achievement statement
  - Recipient details
  - Unique certificate code/ID
  - Teacher signature space (optional)
  - Date and seal/badge

---

## Frontend Implementation

### 6. React Components

#### New Components
```
frontend/src/components/certificates/
├── CertificateCard.tsx              # Display single certificate
├── CertificatePreview.tsx           # Modal/full preview
├── CertificateDownloadButton.tsx    # PDF download trigger
├── CertificateShareModal.tsx        # Share dialog with unique link
└── CertificateList.tsx              # Grid/list of certificates

frontend/src/pages/
├── trainee/
│   └── CertificatesPage.tsx         # /trainee/certificates
├── trainer/
│   └── CertificatesPage.tsx         # /trainer/certificates - issued by this trainer
└── admin/
    └── CertificatesPage.tsx         # /admin/certificates - all system certificates
```

#### Profile Updates
- Add "Certificates" section to trainee profile
- Show recent certificates with badges
- Link to full certificates page

### 7. Key UI Features

1. **Trainee Dashboard**:
   - "New Certificate!" badge on completed courses
   - Certificates tab showing all issued certs
   - Download button for each certificate
   - Share button with copy-to-clipboard for shareable link
   - Certificate preview modal

2. **Trainer Dashboard**:
   - "Certificates Issued" stats card
   - List of all certificates issued for courses taught
   - Ability to view trainee's certificate details
   - Revoke certificate option (with reason)
   - Export certificates issued list (optional)

3. **Admin Dashboard**:
   - "Total Certificates Issued" metric
   - Trend chart of certificate issuance over time
   - Search/filter certificates by trainee, course, date
   - View all certificates with full audit trail
   - Revoke/suspend certificates capability

---

## Notification System

### 8. In-App Notification

When certificate is issued:
```json
{
  "type": "certificate_issued",
  "title": "Certificate Earned! 🎓",
  "message": "You have successfully passed '[Course Name]' and earned a certificate!",
  "reference_id": "<certificate_id>",
  "action_url": "/trainee/certificates/<certificate_id>",
  "action_label": "View Certificate"
}
```

---

## Security & Verification

### 9. Security Measures

1. **Access Control**:
   - Students can only view their own certificates (except shared)
   - Trainers can view certificates from their courses
   - Admins can view all certificates
   - Use @Roles() guard on all certificate endpoints

2. **Certificate Verification**:
   - Unique certificate code (UUID or hash)
   - Public verification endpoint: `/api/certificates/verify/:code`
   - Returns certificate metadata (without private details if accessed by non-owner)

3. **Revocation**:
   - Mark certificate as revoked with reason
   - Verification endpoint shows revocation status
   - Revocation audit trail

4. **PDF Security**:
   - Generate PDF on-the-fly or cache in S3
   - Use signed URLs with expiration for S3 access
   - Never expose raw S3 URLs to client

---

## Implementation Steps

### Phase 1: Database & Backend (Days 1-2)
1. [ ] Create migrations for certificates table & notifications
2. [ ] Generate NestJS certificates module
3. [ ] Implement CertificateService with business logic
4. [ ] Implement PDFGeneratorService for certificate PDF creation
5. [ ] Create DTOs and entities
6. [ ] Write API endpoints
7. [ ] Add certificate generation trigger in AssessmentsService

### Phase 2: Notifications (Day 2)
1. [ ] Create/update notifications service
2. [ ] Implement in-app notification creation
3. [ ] Add GET endpoints for user notifications

### Phase 3: Frontend - Trainee (Day 3)
1. [ ] Create Certificates page
2. [ ] Create CertificateCard component
3. [ ] Add download functionality
4. [ ] Add share modal with unique link copy
5. [ ] Integrate into profile
6. [ ] Add notification UI

### Phase 4: Frontend - Trainer & Admin (Days 4)
1. [ ] Create trainer certificates view
2. [ ] Create admin certificates dashboard
3. [ ] Add filtering/search
4. [ ] Add revocation UI
5. [ ] Add revocation reason modal

### Phase 5: Polish & Testing (Days 5+)
1. [ ] E2E testing of certificate generation flow
2. [ ] PDF layout refinement
3. [ ] Error handling & edge cases
4. [ ] Performance optimization
5. [ ] Documentation

---

## File Storage Strategy

### Option 1: S3/Cloud Storage (Recommended)
- Store PDFs in S3 with unique naming: `certificates/{user_id}/{certificate_id}.pdf`
- Use signed URLs (expires in 1 hour) for secure download access
- Cost: ~$0.023 per 10,000 downloads

### Option 2: Local Storage (for MVP)
- Store PDFs locally in `/uploads/certificates/{user_id}/{certificate_id}.pdf`
- Serve via Node.js endpoint with proper authorization
- Backup to S3 periodically

### Option 3: Dynamic PDF Generation
- Generate PDF on-demand when downloaded
- No storage cost
- Slightly slower response
- Can use either approach above for caching

---

## Data Flow Diagram

```
User completes assessment
    ↓
Assessment service calculates score
    ↓
if (score ≥ pass_percentage) {
    ↓
    Certificate service generates PDF
    ↓
    Store PDF in S3/local storage
    ↓
    Create certificate record in DB
    ↓
    Create notification
    ↓
    Notify frontend (WebSocket/polling)
}
    ↓
Trainee receives notification
    ↓
Navigate to Certificates page
    ↓
View certificate with options to:
  - Download PDF
  - View preview
  - Copy share link
  - View on profile
    ↓
Trainer/Admin can:
  - View all issued certificates
  - Verify certificate authenticity
  - Revoke if needed
```

---

## Testing Strategy

1. **Unit Tests**:
   - CertificateService generation logic
   - PDFGeneratorService template rendering
   - Notification creation

2. **Integration Tests**:
   - Assessment → Certificate flow
   - PDF generation with actual data
   - API endpoints with authentication

3. **E2E Tests**:
   - Student takes assessment → certificate issued → downloads
   - Trainer views issued certificates
   - Admin revokes certificate

---

## Future Enhancements

1. **Blockchain verification** - Hash certificate on blockchain for immutable proof
2. **QR code** - Add QR code to PDF linking to verification endpoint
3. **Email** - Send certificate PDF via email (optional)
4. **Template customization** - Admin can customize certificate template
5. **Batch issuance** - Admin can bulk-issue certificates for manual approvals
6. **Digital wallet** - Integration with DigiLocker/credential wallet
7. **Certificate analytics** - Track certificate downloads, shares, verifications
8. **Multi-language** - Support certificates in multiple languages

---

## Estimated Effort

- **Backend**: 2-3 days
- **Frontend**: 2-3 days
- **Testing & Polish**: 1-2 days
- **Total**: 5-8 days for MVP

