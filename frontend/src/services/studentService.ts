import api from './api';
import type { Student, PageResponse, ApiResponse } from '../types';

export const studentService = {
  getAll: async (params?: { page?: number; size?: number; search?: string; categoryId?: number; status?: string }) => {
    const res = await api.get<ApiResponse<PageResponse<Student>>>('/students', { params });
    return res.data.data;
  },
  getById: async (id: number): Promise<Student> => {
    const res = await api.get<ApiResponse<Student>>(`/students/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<Student>): Promise<Student> => {
    const res = await api.post<ApiResponse<Student>>('/students', data);
    return res.data.data;
  },
  update: async (id: number, data: Partial<Student>): Promise<Student> => {
    const res = await api.put<ApiResponse<Student>>(`/students/${id}`, data);
    return res.data.data;
  },
  deactivate: async (id: number): Promise<void> => {
    await api.patch(`/students/${id}/deactivate`);
  },
  getQrCode: async (id: number): Promise<string> => {
    const res = await api.get<ApiResponse<{ qrCodeBase64: string }>>(`/students/${id}/qr-code`);
    return res.data.data.qrCodeBase64;
  },
  regenerateQr: async (id: number): Promise<string> => {
    const res = await api.post<ApiResponse<{ qrToken: string }>>(`/students/${id}/regenerate-qr`);
    return res.data.data.qrToken;
  },
};
