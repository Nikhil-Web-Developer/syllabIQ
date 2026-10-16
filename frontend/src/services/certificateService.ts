import api from './api';
import { Certificate, CertificateVerification } from '../types';

export const certificateService = {
  getMyCertificates: async (): Promise<Certificate[]> => {
    const res = await api.get('/users/me/certificates');
    return res.data;
  },

  verifyCertificate: async (code: string): Promise<CertificateVerification> => {
    const res = await api.get(`/certificates/verify/${code}`);
    return res.data;
  },
};
