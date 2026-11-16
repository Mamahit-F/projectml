import api from './api';
import type { FollowUp, PageResponse, ApiResponse } from '../types';

export * from './authService';
export * from './studentService';
export * from './eventService';
export * from './attendanceService';
export * from './violationService';
export * from './welfareService';


export const followUpService = {
  getAll: async (params?: { page?: number; size?: number; studentId?: number }) => {
    const res = await api.get<ApiResponse<PageResponse<FollowUp>>>('/follow-ups', { params });
    return res.data.data;
  },
  create: async (data: Partial<FollowUp>): Promise<FollowUp> => {
    const res = await api.post<ApiResponse<FollowUp>>('/follow-ups', data);
    return res.data.data;
  },
  getByStudent: async (studentId: number): Promise<FollowUp[]> => {
    const res = await api.get<ApiResponse<FollowUp[]>>(`/follow-ups/student/${studentId}`);
    return res.data.data;
  },
};

export const predictionService = {
  runPredictions: async (): Promise<void> => {
    await api.post('/predictions/predict-all');
  },
  getAll: async (params?: { riskLevel?: string; categoryId?: number }): Promise<any[]> => {
    const res = await api.get('/predictions/latest');
    let list = res.data.data || [];
    if (params?.riskLevel) {
      list = list.filter((p: any) => p.riskCategory === params.riskLevel);
    }
    return list;
  },
  getSummary: async (): Promise<import('../types').PredictionSummary> => {
    const res = await api.get('/predictions/summary');
    return res.data.data;
  },
  getByStudent: async (studentId: number): Promise<any> => {
    const res = await api.get(`/predictions/student/${studentId}`);
    return res.data.data;
  },
};

export const dashboardService = {
  getOverview: async (): Promise<import('../types').DashboardOverview> => {
    const res = await api.get('/dashboard/overview');
    return res.data.data;
  },
};

export const reportService = {
  downloadAttendanceReport: async (eventId?: number, startDate?: string, endDate?: string): Promise<Blob> => {
    const res = await api.get('/reports/attendance', {
      params: { eventId, startDate, endDate },
      responseType: 'blob',
    });
    return res.data;
  },
  downloadViolationReport: async (startDate?: string, endDate?: string): Promise<Blob> => {
    const res = await api.get('/reports/violations', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    return res.data;
  },
  downloadStudentReport: async (): Promise<Blob> => {
    const res = await api.get('/reports/students', { responseType: 'blob' });
    return res.data;
  },
};

export const userService = {
  getAll: async (): Promise<import('../types').User[]> => {
    const res = await api.get('/users');
    return res.data.data;
  },
  create: async (data: Partial<import('../types').User> & { password: string }): Promise<import('../types').User> => {
    const res = await api.post('/users', data);
    return res.data.data;
  },
  update: async (id: number, data: Partial<import('../types').User>): Promise<import('../types').User> => {
    const res = await api.put(`/users/${id}`, data);
    return res.data.data;
  },
  toggleEnabled: async (id: number): Promise<void> => {
    await api.patch(`/users/${id}/toggle-status`);
  },
};

export const residenceService = {
  getAll: async (): Promise<import('../types').ResidenceCategory[]> => {
    const res = await api.get('/residence-categories');
    return res.data.data;
  },
  update: async (id: number, data: Partial<import('../types').ResidenceCategory>): Promise<import('../types').ResidenceCategory> => {
    const res = await api.put(`/residence-categories/${id}`, data);
    return res.data.data;
  },
};
