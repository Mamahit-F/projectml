import api from './api';
import type { WorshipEvent, PageResponse, ApiResponse } from '../types';

export const eventService = {
  getAll: async (params?: { page?: number; size?: number; status?: string; eventType?: string }) => {
    const res = await api.get<ApiResponse<PageResponse<WorshipEvent>>>('/worship-events', { params });
    return res.data.data;
  },
  getById: async (id: number): Promise<WorshipEvent> => {
    const res = await api.get<ApiResponse<WorshipEvent>>(`/worship-events/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<WorshipEvent>): Promise<WorshipEvent> => {
    const res = await api.post<ApiResponse<WorshipEvent>>('/worship-events', data);
    return res.data.data;
  },
  update: async (id: number, data: Partial<WorshipEvent>): Promise<WorshipEvent> => {
    const res = await api.put<ApiResponse<WorshipEvent>>(`/worship-events/${id}`, data);
    return res.data.data;
  },
  cancel: async (id: number): Promise<void> => {
    await api.patch(`/worship-events/${id}/cancel`);
  },
};
