import api from './api';
import type { ApiResponse, PageResponse, WelfareReport } from '../types';

export const welfareService = {
  async getAll(params?: { status?: string; priority?: string; reportType?: string; page?: number; size?: number }) {
    const res = await api.get<ApiResponse<PageResponse<WelfareReport>>>('/welfare-reports', { params });
    return res.data.data;
  },

  async getByStudent(studentId: number) {
    const res = await api.get<ApiResponse<WelfareReport[]>>(`/welfare-reports/student/${studentId}`);
    return res.data.data || [];
  },

  async create(data: { studentId: number; reportType: string; priority: string; description: string }) {
    const res = await api.post<ApiResponse<WelfareReport>>('/welfare-reports', data);
    return res.data.data;
  },

  async update(id: number, data: { status: string; priority?: string; resolutionNotes?: string }) {
    const res = await api.put<ApiResponse<WelfareReport>>(`/welfare-reports/${id}`, data);
    return res.data.data;
  },
};
