import api from './api';
import type { LoginRequest, LoginResponse, ApiResponse, AuthUser, Role } from '../types';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<any>>('/auth/login', data);
    const backendData = res.data.data;

    const token = backendData.accessToken || backendData.token;
    const rawRole = (backendData.user?.role || backendData.role || 'STAFF') as string;
    const cleanRole = (rawRole.replace(/^ROLE_/, '') || 'STAFF') as Role;

    const user: AuthUser = backendData.user || {
      id: backendData.id,
      username: backendData.username,
      email: backendData.email,
      fullName: backendData.fullName,
      role: cleanRole,
      enabled: backendData.enabled ?? backendData.active ?? true,
    };

    return {
      accessToken: token,
      tokenType: backendData.tokenType || 'Bearer',
      user,
    };
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('si_token');
    localStorage.removeItem('si_user');
  },
  getProfile: async () => {
    const res = await api.get('/auth/me');
    return res.data.data;
  },
};
