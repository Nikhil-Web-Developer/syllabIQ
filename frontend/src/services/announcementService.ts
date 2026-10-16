import api from './api';
import { Announcement, AnnouncementType } from '../types';

export interface CreateAnnouncementDto {
  title: string;
  body: string;
  type: AnnouncementType;
}

export interface UpdateAnnouncementDto {
  title?: string;
  body?: string;
  type?: AnnouncementType;
}

export interface AnnouncementQueryParams {
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const announcementService = {
  getAnnouncements: async (params?: AnnouncementQueryParams): Promise<Announcement[]> => {
    const res = await api.get('/announcements', { params });
    return res.data;
  },

  getAnnouncementById: async (id: string): Promise<Announcement> => {
    const res = await api.get(`/announcements/${id}`);
    return res.data;
  },

  createAnnouncement: async (dto: CreateAnnouncementDto): Promise<Announcement> => {
    const res = await api.post('/admin/announcements', dto);
    return res.data;
  },

  updateAnnouncement: async (id: string, dto: UpdateAnnouncementDto): Promise<Announcement> => {
    const res = await api.patch(`/admin/announcements/${id}`, dto);
    return res.data;
  },

  deleteAnnouncement: async (id: string): Promise<{ message: string; id: string }> => {
    const res = await api.delete(`/admin/announcements/${id}`);
    return res.data;
  },
};
