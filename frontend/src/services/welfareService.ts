import api from './api';
import type { WelfareReport, PageResponse, ApiResponse } from '../types';

export const welfareService = {
  getAll: async (params?: { page?: number; size?: number; status?: string; studentId?: number }) => {
    const res = await api.get<ApiResponse<PageResponse<WelfareReport>>>('/welfare-reports', { params });
    return res.data.data;
  },
  getById: async (id: number): Promise<WelfareReport> => {
    const res = await api.get<ApiResponse<WelfareReport>>(`/welfare-reports/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<WelfareReport>): Promise<WelfareReport> => {
    const res = await api.post<ApiResponse<WelfareReport>>('/welfare-reports', data);
    return res.data.data;
  },
  update: async (id: number, data: Partial<WelfareReport>): Promise<WelfareReport> => {
    const res = await api.put<ApiResponse<WelfareReport>>(`/welfare-reports/${id}`, data);
    return res.data.data;
  },
};
