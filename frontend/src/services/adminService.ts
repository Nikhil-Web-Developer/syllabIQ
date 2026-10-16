import api from './api';
import {
  CompetencyMatchResult,
  Skill,
  DashboardEnrollmentsData,
  DashboardCertificationsData,
  DashboardAssessmentsData,
  DashboardParticipationData,
} from '../types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'trainee' | 'trainer' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  bio?: string | null;
  years_experience?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  target_id?: string;
  metadata?: any;
  created_at: string;
}

export const adminService = {
  getUsers: async (params?: {
    status?: string;
    role?: string;
    search?: string;
  }): Promise<AdminUser[]> => {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  approveUser: async (
    userId: string,
  ): Promise<{ message: string; user: AdminUser }> => {
    const res = await api.patch(`/admin/users/${userId}/approve`);
    return res.data;
  },

  rejectUser: async (
    userId: string,
    reason?: string,
  ): Promise<{ message: string; user: AdminUser }> => {
    const res = await api.patch(`/admin/users/${userId}/reject`, { reason });
    return res.data;
  },

  updateUserRole: async (
    userId: string,
    role: 'trainee' | 'trainer' | 'admin',
  ): Promise<{ message: string; user: AdminUser }> => {
    const res = await api.patch(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  getAuditLogs: async (params?: {
    action?: string;
    actor?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> => {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  },

  getDashboardEnrollments: async (params?: {
    from?: string;
    to?: string;
  }): Promise<DashboardEnrollmentsData> => {
    const res = await api.get('/admin/dashboard/enrollments', { params });
    return res.data;
  },

  getDashboardCertifications: async (params?: {
    from?: string;
    to?: string;
  }): Promise<DashboardCertificationsData> => {
    const res = await api.get('/admin/dashboard/certifications', { params });
    return res.data;
  },

  getDashboardAssessments: async (params?: {
    from?: string;
    to?: string;
  }): Promise<DashboardAssessmentsData> => {
    const res = await api.get('/admin/dashboard/assessments', { params });
    return res.data;
  },

  getDashboardParticipation: async (params?: {
    from?: string;
    to?: string;
  }): Promise<DashboardParticipationData> => {
    const res = await api.get('/admin/dashboard/participation', { params });
    return res.data;
  },

  matchTrainers: async (params: {
    course_id?: string;
    skill_id?: string;
  }): Promise<CompetencyMatchResult> => {
    const res = await api.get('/admin/competency/match', { params });
    return res.data;
  },

  assignCourseTrainer: async (
    courseId: string,
    trainerId: string,
  ): Promise<{ message: string; course: any }> => {
    const res = await api.post(`/admin/courses/${courseId}/assign-trainer`, {
      trainer_id: trainerId,
    });
    return res.data;
  },

  getSkillsTaxonomy: async (category?: string): Promise<Skill[]> => {
    const res = await api.get('/skills', { params: { category } });
    return res.data;
  },
};


