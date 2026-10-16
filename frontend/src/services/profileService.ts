import api from './api';
import { Certificate, ProficiencyLevel, Skill, SkillSource, TraineeProfile, TrainerProfile, User, UserSkill } from '../types';

export type { Certificate, ProficiencyLevel, Skill, SkillSource, TraineeProfile, TrainerProfile, User, UserSkill };

export interface TraineeProfileResponse {
  user: User;
  profile: TraineeProfile;
  skills: UserSkill[];
  certificates: (Certificate & { signed_url?: string })[];
}

export interface TrainerProfileResponse {
  user: User;
  profile: TrainerProfile;
  skills: UserSkill[];
}

export interface PublicProfileResponse {
  user: {
    id: string;
    name: string;
    role: string;
    joinedAt?: string;
  };
  profile: TraineeProfile | TrainerProfile | null;
  skills: UserSkill[];
  certificates?: Certificate[];
}

export const profileService = {
  // Skills Taxonomy
  getSkills: async (category?: string): Promise<Skill[]> => {
    const res = await api.get('/skills', {
      params: category ? { category } : undefined,
    });
    return res.data;
  },

  getSkillsTaxonomy: async (category?: string): Promise<Skill[]> => {
    const res = await api.get('/skills', {
      params: category ? { category } : undefined,
    });
    return res.data;
  },

  createSkill: async (name: string, category: string): Promise<Skill> => {
    const res = await api.post('/admin/skills', { name, category });
    return res.data;
  },

  // User Skills (Shared by Trainee & Trainer)
  tagSkill: async (
    skillId: string,
    proficiencyLevel: ProficiencyLevel,
    source: SkillSource = 'self_declared',
  ): Promise<UserSkill> => {
    const res = await api.post('/users/me/skills', {
      skillId,
      proficiencyLevel,
      source,
    });
    return res.data;
  },

  removeSkill: async (skillId: string): Promise<{ message: string; skillId: string }> => {
    const res = await api.delete(`/users/me/skills/${skillId}`);
    return res.data;
  },

  // Trainee Profile
  getTraineeProfile: async (): Promise<TraineeProfileResponse> => {
    const res = await api.get('/users/me/profile');
    return res.data;
  },

  updateTraineeProfile: async (data: {
    name?: string;
    bio?: string;
    qualifications?: any[];
    work_experience?: any[];
    workExperience?: any[];
    interests?: string[];
  }): Promise<TraineeProfileResponse> => {
    const payload = {
      ...data,
      work_experience: data.work_experience || data.workExperience,
    };
    const res = await api.patch('/users/me/profile', payload);
    return res.data;
  },

  // Trainer Profile
  getTrainerProfile: async (): Promise<TrainerProfileResponse> => {
    const res = await api.get('/users/me/trainer-profile');
    return res.data;
  },

  updateTrainerProfile: async (data: {
    name?: string;
    bio?: string;
    years_experience?: number;
    yearsExperience?: number;
    qualifications?: any[];
  }): Promise<TrainerProfileResponse> => {
    const payload = {
      ...data,
      years_experience: data.years_experience ?? data.yearsExperience,
    };
    const res = await api.patch('/users/me/trainer-profile', payload);
    return res.data;
  },

  // Certificates & Uploads
  uploadCertificate: async (
    fileOrFormData: File | FormData,
    title?: string,
    issuingBody?: string,
    issueDate?: string,
    courseId?: string,
  ): Promise<{ message: string; certificate: Certificate & { signed_url?: string } }> => {
    let formData: FormData;
    if (fileOrFormData instanceof FormData) {
      formData = fileOrFormData;
    } else {
      formData = new FormData();
      formData.append('file', fileOrFormData);
      if (title) formData.append('title', title);
      if (issuingBody) formData.append('issuing_body', issuingBody);
      if (issueDate) formData.append('issue_date', issueDate);
      if (courseId) formData.append('course_id', courseId);
    }

    const res = await api.post('/users/me/certificates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  getCertificates: async (): Promise<(Certificate & { signed_url?: string })[]> => {
    const res = await api.get('/users/me/certificates');
    return res.data;
  },

  getMyCertificates: async (): Promise<(Certificate & { signed_url?: string })[]> => {
    const res = await api.get('/users/me/certificates');
    return res.data;
  },

  // Public View Others Profile
  getPublicProfile: async (userId: string): Promise<PublicProfileResponse> => {
    const res = await api.get(`/users/${userId}/profile`);
    return res.data;
  },
};
