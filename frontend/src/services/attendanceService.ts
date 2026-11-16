import api from './api';
import type { Attendance, AttendanceRule, PageResponse, ApiResponse } from '../types';

export const attendanceService = {
  getAll: async (params?: { page?: number; size?: number; eventId?: number; studentId?: number; status?: string }) => {
    const res = await api.get<ApiResponse<PageResponse<Attendance>>>('/attendances', { params });
    return res.data.data;
  },
  scanQr: async (qrToken: string, worshipEventId: number): Promise<Attendance> => {
    const res = await api.post<ApiResponse<Attendance>>('/attendances/scan-qr', { qrToken, worshipEventId });
    return res.data.data;
  },
  recordManual: async (data: { studentId: number; worshipEventId: number; status: string; notes?: string }): Promise<Attendance> => {
    const res = await api.post<ApiResponse<Attendance>>('/attendances/manual', data);
    return res.data.data;
  },
  update: async (id: number, data: { status: string; notes?: string }): Promise<Attendance> => {
    const res = await api.put<ApiResponse<Attendance>>(`/attendances/${id}`, data);
    return res.data.data;
  },
  getRules: async (): Promise<AttendanceRule[]> => {
    const res = await api.get<ApiResponse<AttendanceRule[]>>('/attendance-rules');
    return res.data.data;
  },
  updateRule: async (id: number, data: Partial<AttendanceRule>): Promise<AttendanceRule> => {
    const res = await api.put<ApiResponse<AttendanceRule>>(`/attendance-rules/${id}`, data);
    return res.data.data;
  },
  getByEvent: async (eventId: number): Promise<Attendance[]> => {
    const res = await api.get<ApiResponse<Attendance[]>>(`/attendances/event/${eventId}`);
    return res.data.data;
  },
};
