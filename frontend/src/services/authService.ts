import api from './api';
import type { ApiResponse, AuthUser } from '../types';

export const authService = {
  async login(credentials: { username: string; password: string }) {
    const res = await api.post<ApiResponse<any>>('/auth/login', credentials);
    const payload = res.data.data;
    const accessToken: string = payload?.token || payload?.accessToken;
    const user: AuthUser = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      fullName: payload.fullName,
      role: 'USER',
    };
    return { accessToken, user };
  },

  async me() {
    const res = await api.get<ApiResponse<any>>('/auth/me');
    const u = res.data.data;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: 'USER' as const,
      active: u.active,
    };
  },

  async updateProfile(data: { fullName: string; email: string; newPassword?: string }) {
    const res = await api.put<ApiResponse<any>>('/auth/profile', {
      fullName: data.fullName,
      email: data.email,
      role: 'ROLE_USER',
      newPassword: data.newPassword || undefined,
    });
    const u = res.data.data;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: 'USER' as const,
    };
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
  },
};
