import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 12000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rdm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rdm:unauthorized', {
          detail: {
            message: error?.response?.data?.error?.message || error?.response?.data?.message || 'Session expired'
          }
        })
      );
    }
    return Promise.reject(error);
  }
);

export default api;
