import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor – attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('si_token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('si_token');
      localStorage.removeItem('si_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
