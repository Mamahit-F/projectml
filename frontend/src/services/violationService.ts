import api from './api';
import type { ViolationPoint, ViolationPointRule, PageResponse, ApiResponse } from '../types';

export const violationService = {
  getAll: async (params?: { page?: number; size?: number; studentId?: number }) => {
    const res = await api.get<ApiResponse<PageResponse<ViolationPoint>>>('/violation-points', { params });
    return res.data.data;
  },
  getRules: async (): Promise<ViolationPointRule[]> => {
    const res = await api.get<ApiResponse<ViolationPointRule[]>>('/violation-points/rules');
    return res.data.data;
  },
  adjust: async (studentId: number, data: { points: number; reason: string; notes?: string }): Promise<void> => {
    await api.post(`/violation-points/adjust/${studentId}`, data);
  },
  getByStudent: async (studentId: number): Promise<ViolationPoint[]> => {
    const res = await api.get<ApiResponse<ViolationPoint[]>>(`/violation-points/student/${studentId}`);
    return res.data.data;
  },
};
