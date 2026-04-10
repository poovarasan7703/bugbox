import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthRequest = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const bugAPI = {
  reportBug: (formData) =>
    api.post('/bugs/report-bug', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getBugs: () => api.get('/bugs'),
  getBug: (id) => api.get(`/bugs/${id}`),
  updateStatus: (id, status) => api.put(`/bugs/${id}/status`, { status }),
  addComment: (id, text) => api.post(`/bugs/${id}/comment`, { text }),
};

export default api;
