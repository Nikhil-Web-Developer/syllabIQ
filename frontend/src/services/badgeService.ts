import api from './api';
import { BadgeItem } from '../types';

export const badgeService = {
  getMyBadges: async (): Promise<BadgeItem[]> => {
    const res = await api.get('/users/me/badges');
    return res.data;
  },

  getAllBadges: async (): Promise<BadgeItem[]> => {
    const res = await api.get('/badges');
    return res.data;
  },
};
