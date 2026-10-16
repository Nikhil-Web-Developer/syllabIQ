import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }

  const token = localStorage.getItem('syllabiq_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Silent Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/signup')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('syllabiq_refresh_token');

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );
        const { accessToken, refreshToken: newRefresh } = res.data.tokens;
        localStorage.setItem('syllabiq_access_token', accessToken);
        if (newRefresh) {
          localStorage.setItem('syllabiq_refresh_token', newRefresh);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('syllabiq_access_token');
        localStorage.removeItem('syllabiq_refresh_token');
        localStorage.removeItem('syllabiq_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
