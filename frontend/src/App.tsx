import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleRoute } from './components/layout/RoleRoute';

// Public & Auth Pages
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { CourseCatalogPage } from './pages/public/CourseCatalogPage';
import { CertificateVerificationPage } from './pages/public/CertificateVerificationPage';
import { PublicProfilePage } from './pages/public/PublicProfilePage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// Trainee Pages
import { TraineeDashboardPage } from './pages/trainee/TraineeDashboardPage';
import { TraineeProfilePage } from './pages/trainee/TraineeProfilePage';
import { TraineeCoursesPage } from './pages/trainee/TraineeCoursesPage';
import { TraineeCourseDetailPage } from './pages/trainee/TraineeCourseDetailPage';
import { TraineeAssessmentPage } from './pages/trainee/TraineeAssessmentPage';
import { TraineeCertificatesPage } from './pages/trainee/TraineeCertificatesPage';
import { TraineeFeedbackPage } from './pages/trainee/TraineeFeedbackPage';

// Trainer Pages
import { TrainerDashboardPage } from './pages/trainer/TrainerDashboardPage';
import { TrainerProfilePage } from './pages/trainer/TrainerProfilePage';
import { TrainerCoursesPage } from './pages/trainer/TrainerCoursesPage';
import { TrainerCourseCreatePage } from './pages/trainer/TrainerCourseCreatePage';
import { TrainerQuestionsPage } from './pages/trainer/TrainerQuestionsPage';
import { TrainerTraineesPage } from './pages/trainer/TrainerTraineesPage';
import { TrainerLibraryPage } from './pages/trainer/TrainerLibraryPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCompetencyPage } from './pages/admin/AdminCompetencyPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CourseCatalogPage />} />
        <Route path="/verify/:code" element={<CertificateVerificationPage />} />
        <Route path="/verify" element={<CertificateVerificationPage />} />
        <Route path="/profile/:userId" element={<PublicProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />

        {/* Protected Routes (Requires Auth & Approved Status) */}
        <Route element={<ProtectedRoute />}>
          {/* Trainee Routes */}
          <Route element={<RoleRoute allowedRoles={['trainee', 'admin']} />}>
            <Route path="/trainee/dashboard" element={<TraineeDashboardPage />} />
            <Route path="/trainee/profile" element={<TraineeProfilePage />} />
            <Route path="/trainee/courses" element={<TraineeCoursesPage />} />
            <Route path="/trainee/courses/:id" element={<TraineeCourseDetailPage />} />
            <Route
              path="/trainee/courses/:id/assessment/:qbId"
              element={<TraineeAssessmentPage />}
            />
            <Route
              path="/trainee/courses/:id/assessment"
              element={<TraineeAssessmentPage />}
            />
            <Route
              path="/trainee/assessments/:id"
              element={<TraineeAssessmentPage />}
            />
            <Route path="/trainee/certificates" element={<TraineeCertificatesPage />} />
            <Route path="/trainee/feedback/:courseId" element={<TraineeFeedbackPage />} />
          </Route>

          {/* Trainer Routes */}
          <Route element={<RoleRoute allowedRoles={['trainer', 'admin']} />}>
            <Route path="/trainer/dashboard" element={<TrainerDashboardPage />} />
            <Route path="/trainer/profile" element={<TrainerProfilePage />} />
            <Route path="/trainer/courses" element={<TrainerCoursesPage />} />
            <Route path="/trainer/courses/new" element={<TrainerCourseCreatePage />} />
            <Route path="/trainer/courses/:id/questions" element={<TrainerQuestionsPage />} />
            <Route path="/trainer/courses/:id/trainees" element={<TrainerTraineesPage />} />
            <Route path="/trainer/library" element={<TrainerLibraryPage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/competency-mapping" element={<AdminCompetencyPage />} />
            <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
            <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default App;
