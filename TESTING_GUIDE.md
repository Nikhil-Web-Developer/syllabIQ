# SyllabIQ Certificate System - End-to-End Testing Guide

## Pre-requisites

✅ Backend running on localhost:3000
✅ Frontend running on localhost:5173
✅ PostgreSQL database with all migrations applied
✅ Test user accounts (trainee, trainer, admin)
✅ Test course with question bank

---

## Test Scenario: Student Takes Assessment & Gets Certificate

### Step 1: Backend Setup (5 minutes)

1. **Install PDF dependency**
   ```bash
   cd backend
   npm install pdfkit
   npm install --save-dev @types/pdfkit
   ```

2. **Run migrations**
   ```bash
   npm run db:migrate
   # or if you have a migration command:
   npm run db:seed  # if using seed files
   ```

3. **Start backend**
   ```bash
   npm run start:dev
   ```
   You should see: "🚀 Server running on http://localhost:3000"

4. **Verify API is working**
   ```bash
   curl http://localhost:3000/api/health
   # Should return: { "status": "ok" }
   ```

---

### Step 2: Frontend Setup (5 minutes)

1. **Install frontend dependencies** (if not already done)
   ```bash
   cd frontend
   npm install
   ```

2. **Start frontend**
   ```bash
   npm run dev
   ```
   You should see: "➜ Local: http://localhost:5173"

---

### Step 3: Test Assessment → Certificate Flow (15 minutes)

#### 3.1 Login as Trainee
1. Go to http://localhost:5173/login
2. Enter trainee credentials
   - Email: `trainee@test.com`
   - Password: `password`
3. Click "Login"
4. Verify you land on Trainee Dashboard

#### 3.2 Enroll in Course (if not already enrolled)
1. Go to `/trainee/courses`
2. Find a test course with assessments
3. Click "Enroll" if not enrolled
4. You should see "Enrolled" status

#### 3.3 Take Assessment
1. Go to `/trainee/courses/:courseId`
2. Look for section "Assessments" or "Take Assessment"
3. Click "Start Assessment" or similar
4. You should see questions appear
5. Select answers (make sure to select CORRECT answers to pass)
6. Click "Submit Assessment"
7. System should calculate score
8. If score ≥ pass_percentage: 
   - ✅ Certificate generated
   - ✅ Notification appears
9. You should see result page showing:
   ```
   Score: 85%
   Status: PASSED ✅
   Certificate: Issued 🎓
   ```

#### 3.4 View Certificate in UI
1. You should see notification banner: "Certificate Earned! 🎓"
2. Click notification or go to `/trainee/certificates`
3. You should see your certificate card with:
   - Course name
   - Teacher name
   - Score: 85%
   - Issue date
   - Certificate ID
   - Buttons: Preview, Download, Share

#### 3.5 Download Certificate PDF
1. On certificate card, click "Download" button
2. Browser should download file: `certificate-<cert-id>.pdf`
3. Open PDF in viewer
4. Verify it contains:
   - Your name
   - Course title
   - Teacher name
   - Score achieved
   - Unique certificate code
   - Issue date
   - Organization branding
   - Verification URL

#### 3.6 Create Shareable Link
1. Click "Share" button on certificate card
2. Modal appears: "Share Certificate"
3. Check "Make this link publicly shareable"
4. Leave expiration date empty (or set one)
5. Click "Create Link"
6. URL appears in text field
7. Click copy icon (or keyboard Ctrl+C)
8. Verify "Link copied to clipboard!" message

#### 3.7 View Shared Certificate (Public)
1. Open new browser tab (or incognito)
2. Paste the share link
3. You should see certificate details:
   - Course name
   - Student name
   - Teacher name
   - Score
   - Issue date
   - Certificate ID
4. ✅ No login required!

#### 3.8 Verify Certificate (Public)
1. Go to `http://localhost:3000/api/certificates/verify/CERT-MOES-2026-XXXXXX`
   (Replace with actual certificate code from your cert)
2. You should see JSON response:
   ```json
   {
     "valid": true,
     "isRevoked": false,
     "certificateCode": "CERT-MOES-2026-XXXXXX",
     "title": "Certificate of Achievement",
     "traineeName": "Your Name",
     "courseTitle": "Course Name",
     "issueDate": "2026-10-07",
     "verifiedAt": "2026-10-07T10:59:52.955Z"
   }
   ```

---

### Step 4: Test Notifications (10 minutes)

#### 4.1 Check Notification Bell
1. Go back to Dashboard
2. Look at navbar for bell icon 🔔
3. You should see red badge with "1" (unread count)

#### 4.2 Open Notification Center
1. Click bell icon
2. Dropdown appears with notifications
3. You should see entry:
   - Title: "Certificate Earned! 🎓"
   - Message: "You have successfully passed '[Course Name]' and earned a certificate!"
   - Time ago display: "a few seconds ago"
   - Award emoji icon 🎖️

#### 4.3 Click Notification
1. Click on the notification
2. Should navigate to certificate details page
3. Notification should be marked as read
4. Bell badge should disappear

#### 4.4 Mark Notifications Read
1. Click bell again
2. If more notifications exist, click "Mark all read"
3. All notifications should no longer be blue (unread)

---

### Step 5: Test as Trainer (10 minutes)

#### 5.1 Login as Trainer
1. Logout from trainee
2. Login as trainer
   - Email: `trainer@test.com`
   - Password: `password`

#### 5.2 View Issued Certificates
1. Go to `/trainer/certificates`
2. You should see list of certificates issued for your courses
3. Each shows: Student name, Course, Score, Date issued
4. Can view details and revoke if needed

#### 5.3 Revoke a Certificate (Optional)
1. Find a certificate in the list
2. Click "..." or "Actions" menu
3. Click "Revoke"
4. Modal appears asking for revocation reason
5. Enter reason: "Duplicate submission" or similar
6. Click "Confirm Revoke"
7. Certificate should now show "Revoked" badge
8. Verification endpoint should show: `"isRevoked": true`

---

### Step 6: Test as Admin (10 minutes)

#### 6.1 Login as Admin
1. Logout from trainer
2. Login as admin
   - Email: `admin@test.com`
   - Password: `password`

#### 6.2 View All Certificates
1. Go to `/admin/certificates`
2. You should see dashboard with:
   - Total Certificates: count
   - Active Certificates: count
   - Revoked Certificates: count
   - Monthly Issuance Chart: line chart
   - Filter by date range
   - Search by trainee name
   - List of all certificates with filters

#### 6.3 View Certificate Statistics
1. Should see metrics:
   ```
   Total Certificates Issued: 1
   Active Certificates: 0 (if revoked)
   Revoked Certificates: 1
   Monthly Trends: [Graph]
   ```

#### 6.4 Manage Certificates
1. Find the revoked certificate
2. Click to view details
3. Should see:
   - Revocation status: "Revoked"
   - Revocation reason: Your entered reason
   - Revoked timestamp
   - Option to potentially un-revoke (if implemented)

---

### Step 7: API Testing (with Postman/cURL) (15 minutes)

#### 7.1 Get User's Certificates
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/certificates?page=1&limit=10
```

Response:
```json
{
  "certificates": [...],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### 7.2 Get Single Certificate
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/certificates/<cert-id>
```

#### 7.3 Download PDF
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/certificates/<cert-id>/download \
  -o certificate.pdf
```

#### 7.4 Create Share Link
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isPublic": true, "expiresAt": "2026-10-14"}' \
  http://localhost:3000/api/certificates/<cert-id>/share
```

#### 7.5 Get Shared Certificate (No Auth)
```bash
curl http://localhost:3000/api/certificates/share/<share-token>
```

#### 7.6 Verify Certificate (No Auth)
```bash
curl http://localhost:3000/api/certificates/verify/CERT-MOES-2026-XXXXX
```

#### 7.7 Get Notifications
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/notifications?page=1&limit=20
```

#### 7.8 Get Unread Count
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/notifications/unread-count
```

---

## Checklist: Success Criteria

- [ ] Assessment submitted with passing score
- [ ] Certificate generated automatically
- [ ] PDF file created and downloadable
- [ ] Certificate record in database
- [ ] Notification created in-app
- [ ] Notification bell shows unread count
- [ ] Student can view certificate details
- [ ] Student can download PDF with correct info
- [ ] Student can create shareable link
- [ ] Public can view shared certificate
- [ ] Public can verify certificate authenticity
- [ ] Trainer can view issued certificates
- [ ] Trainer can revoke certificate
- [ ] Admin can view all certificates
- [ ] Admin can see statistics
- [ ] Revoked certificate shows revocation status
- [ ] All API endpoints working with correct status codes
- [ ] Access control enforced (trainees can't view others' certs)

---

## Troubleshooting

### Issue: "Certificate not found" after passing assessment
- Check `certificates` table has new columns (migration ran)
- Check `pdfkit` is installed
- Check storage service is configured
- Check logs for specific error

### Issue: PDF not downloading
- Verify `pdf_file_url` is set in database
- Check storage service can access the file
- Check browser download settings
- Try in different browser

### Issue: Notifications not appearing
- Check `notifications` table exists (migration ran)
- Refresh browser page
- Check browser console for JS errors
- Verify notification query returns data

### Issue: Share link gives 404
- Verify `share_token` is in database
- Check URL format is correct
- Verify token hasn't expired
- Try creating new share link

### Issue: Access denied on certificate download
- Make sure you're logged in as correct user
- Verify JWT token is still valid
- Check user ID matches certificate owner
- Try as admin (should have access to all)

---

## Performance Testing

Once basic functionality works, you can test:

### Load Testing
```bash
# Install k6 or Artillery
npm install -g k6

# Create test script
cat > test-certs.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  let response = http.get('http://localhost:3000/api/certificates');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
EOF

# Run
k6 run test-certs.js
```

### Database Query Performance
```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM certificates 
WHERE user_id = 'some-uuid' 
ORDER BY created_at DESC
LIMIT 10;

-- Should use idx_certificates_user_id index
```

---

## Next Steps After Testing

1. ✅ Verify all endpoints work
2. ✅ Test with multiple users
3. ✅ Test edge cases (revoked certs, expired links)
4. ✅ Load test for performance
5. ⏭️ Deploy to staging environment
6. ⏭️ Run full integration tests
7. ⏭️ Deploy to production

---

## Success! 🎉

If you've completed all tests and everything is working, you have a fully functional certificate system!

For questions or issues, refer to:
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- [CERTIFICATE_SYSTEM_PLAN.md](./CERTIFICATE_SYSTEM_PLAN.md)
- Backend logs: `npm run start:dev`
- Frontend console: Press F12 in browser

