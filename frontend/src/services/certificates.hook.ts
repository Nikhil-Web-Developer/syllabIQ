import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

/**
 * Hook for certificate API calls
 */
export const useCertificates = () => {
  const queryClient = useQueryClient();

  // Get certificates list
  const getCertificates = useQuery({
    queryKey: ['certificates'],
    queryFn: async ({ page = 1, limit = 10 } = {}) => {
      const response = await apiClient.get(`/api/certificates`, {
        params: { page, limit },
      });
      return response.data;
    },
  });

  // Get single certificate
  const getCertificateById = useQuery({
    queryKey: ['certificate'],
    enabled: false,
    queryFn: async (certificateId: string) => {
      const response = await apiClient.get(`/api/certificates/${certificateId}`);
      return response.data;
    },
  });

  // Download certificate PDF
  const downloadCertificate = useMutation({
    mutationFn: async (certificateId: string) => {
      const response = await apiClient.get(`/api/certificates/${certificateId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (data, certificateId) => {
      // Trigger download
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    },
  });

  // Create shareable link
  const createShareLink = useMutation({
    mutationFn: async ({ certificateId, isPublic, expiresAt }: {
      certificateId: string;
      isPublic?: boolean;
      expiresAt?: string;
    }) => {
      const response = await apiClient.post(`/api/certificates/${certificateId}/share`, {
        isPublic,
        expiresAt,
      });
      return response.data;
    },
  });

  // Get shared certificate
  const getSharedCertificate = useQuery({
    queryKey: ['certificate', 'shared'],
    enabled: false,
    queryFn: async (shareToken: string) => {
      const response = await apiClient.get(`/api/certificates/share/${shareToken}`);
      return response.data;
    },
  });

  // Verify certificate
  const verifyCertificate = useQuery({
    queryKey: ['certificate', 'verify'],
    enabled: false,
    queryFn: async (code: string) => {
      const response = await apiClient.get(`/api/certificates/verify/${code}`);
      return response.data;
    },
  });

  // Revoke certificate
  const revokeCertificate = useMutation({
    mutationFn: async ({ certificateId, reason }: { certificateId: string; reason: string }) => {
      const response = await apiClient.patch(`/api/certificates/${certificateId}/revoke`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });

  return {
    getCertificates,
    getCertificateById,
    downloadCertificate,
    createShareLink,
    getSharedCertificate,
    verifyCertificate,
    revokeCertificate,
  };
};

/**
 * Hook for notification API calls
 */
export const useNotifications = () => {
  const queryClient = useQueryClient();

  // Get notifications
  const getNotifications = useQuery({
    queryKey: ['notifications'],
    queryFn: async ({ page = 1, limit = 20, unreadOnly = false } = {}) => {
      const response = await apiClient.get(`/api/notifications`, {
        params: { page, limit, unreadOnly },
      });
      return response.data;
    },
  });

  // Get unread count
  const getUnreadCount = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get(`/api/notifications/unread-count`);
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.patch(`/api/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch(`/api/notifications/mark-all-read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.delete(`/api/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
