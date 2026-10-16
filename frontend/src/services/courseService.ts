import api from './api';

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at?: string;
  trainer_id: string;
  trainer_name: string;
  trainer_email?: string;
  skill_id?: string;
  skill_name?: string;
  skill_category?: string;
  avg_rating: number;
  enrollment_count: number;
  resourceCount?: number;
  questionBanks?: Array<{
    id: string;
    title: string;
    deadline?: string;
    pass_percentage?: number;
    time_limit_minutes?: number;
  }>;
  userEnrollment?: {
    id: string;
    enrolled_at: string;
    status: 'active' | 'completed' | 'dropped';
    progress_percent: number;
  } | null;
}

export interface CourseResource {
  id: string;
  course_id: string;
  type: 'video' | 'pdf' | 'ppt' | 'doc' | 'link';
  file_url: string;
  title: string;
  uploaded_at: string;
  signed_url?: string;
}

export interface Enrollment {
  enrollment_id: string;
  id?: string;
  enrolled_at: string;
  enrollment_status: 'active' | 'completed' | 'dropped';
  status?: 'active' | 'completed' | 'dropped';
  progress_percent: number;
  course_id: string;
  course_title: string;
  course_description?: string;
  difficulty: string;
  course_status: string;
  trainer_id: string;
  trainer_name: string;
  skill_id?: string;
  skill_name?: string;
  skill_category?: string;
}

export interface TraineeParticipant {
  enrollment_id: string;
  trainee_id: string;
  trainee_name: string;
  trainee_email: string;
  status: 'active' | 'completed' | 'dropped';
  progress_percent: number;
  enrolled_at: string;
}

export interface CourseQueryParams {
  search?: string;
  skill?: string;
  subject_skill_id?: string;
  difficulty?: string;
  trainer?: string;
  trainer_id?: string;
  status?: string;
}

export const courseService = {
  // Course Catalog & Detail
  getCourses: async (params?: CourseQueryParams): Promise<Course[]> => {
    const response = await api.get('/courses', { params });
    return response.data;
  },

  getCourseById: async (id: string): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  createCourse: async (data: {
    title: string;
    description?: string;
    subjectSkillId?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    status?: 'draft' | 'published' | 'archived';
  }): Promise<Course> => {
    const response = await api.post('/courses', data);
    return response.data;
  },

  updateCourse: async (id: string, data: Partial<Course>): Promise<Course> => {
    const response = await api.patch(`/courses/${id}`, data);
    return response.data;
  },

  publishCourse: async (id: string): Promise<Course> => {
    const response = await api.patch(`/courses/${id}/publish`);
    return response.data;
  },

  archiveCourse: async (id: string): Promise<Course> => {
    const response = await api.patch(`/courses/${id}/archive`);
    return response.data;
  },

  deleteCourse: async (id: string): Promise<{ message: string; archived: boolean; deleted: boolean }> => {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
  },

  // Resources
  getResources: async (courseId: string): Promise<CourseResource[]> => {
    const response = await api.get(`/courses/${courseId}/resources`);
    return response.data;
  },

  uploadResource: async (courseId: string, formData: FormData): Promise<CourseResource> => {
    const response = await api.post(`/courses/${courseId}/resources`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  createLinkResource: async (
    courseId: string,
    data: { title: string; type: 'link'; link_url: string },
  ): Promise<CourseResource> => {
    const response = await api.post(`/courses/${courseId}/resources`, data);
    return response.data;
  },

  deleteResource: async (courseId: string, resourceId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/courses/${courseId}/resources/${resourceId}`);
    return response.data;
  },

  // Enrollments
  enrollCourse: async (courseId: string): Promise<{ message: string; enrollment: any }> => {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  },

  getMyEnrollments: async (): Promise<Enrollment[]> => {
    const response = await api.get('/users/me/enrollments');
    return response.data;
  },

  updateProgress: async (enrollmentId: string, progressPercent: number): Promise<any> => {
    const response = await api.patch(`/enrollments/${enrollmentId}/progress`, {
      progress_percent: progressPercent,
    });
    return response.data;
  },

  updateEnrollmentStatus: async (enrollmentId: string, status: string): Promise<any> => {
    const response = await api.patch(`/enrollments/${enrollmentId}/status`, { status });
    return response.data;
  },

  getCourseEnrollments: async (
    courseId: string,
  ): Promise<{ courseId: string; courseTitle: string; totalEnrollments: number; enrollments: TraineeParticipant[] }> => {
    const response = await api.get(`/courses/${courseId}/enrollments`);
    return response.data;
  },

  submitFeedback: async (courseId: string, rating: number, comment?: string): Promise<any> => {
    const response = await api.post(`/courses/${courseId}/feedback`, { rating, comment });
    return response.data;
  },

  askCourseAi: async (courseId: string, message: string): Promise<{ reply: string }> => {
    const response = await api.post(`/courses/${courseId}/ai-chat`, { message });
    return response.data;
  },
};
