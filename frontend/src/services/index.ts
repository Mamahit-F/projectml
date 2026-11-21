import api from './api';
import type {
  ApiResponse,
  DashboardOverview,
  EmergencyContact,
  FollowUp,
  PageResponse,
  PdfPreviewResponse,
  PdfReportSummary,
  PredictionSummary,
  SemesterSetting,
  StudentPrediction,
} from '../types';

export { authService } from './authService';
export { studentService } from './studentService';
export { welfareService } from './welfareService';

export const pdfReportService = {
  async preview(file: File): Promise<PdfPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<PdfPreviewResponse>>('/pdf-reports/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return res.data.data;
  },

  async importPdf(params: {
    file: File;
    reportDate: string;
    facultyName?: string;
    periodLabel?: string;
    notes?: string;
  }) {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('reportDate', params.reportDate);
    if (params.facultyName) formData.append('facultyName', params.facultyName);
    if (params.periodLabel) formData.append('periodLabel', params.periodLabel);
    if (params.notes) formData.append('notes', params.notes);

    const res = await api.post<ApiResponse<any>>('/pdf-reports/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    });
    return res.data.data;
  },

  async getAll(): Promise<PdfReportSummary[]> {
    const res = await api.get<ApiResponse<PdfReportSummary[]>>('/pdf-reports');
    return res.data.data || [];
  },

  async getDetail(id: number) {
    const res = await api.get<ApiResponse<any>>(`/pdf-reports/${id}`);
    return res.data.data;
  },

  async getRecords(
    id: number,
    params?: { search?: string; studyProgram?: string; riskCategory?: string; page?: number; size?: number }
  ) {
    const res = await api.get<ApiResponse<PageResponse<any>>>(`/pdf-reports/${id}/records`, { params });
    return res.data.data;
  },

  async delete(id: number) {
    await api.delete(`/pdf-reports/${id}`);
  },
};

export const semesterService = {
  async get(): Promise<SemesterSetting> {
    const res = await api.get<ApiResponse<SemesterSetting>>('/semester-settings');
    return res.data.data;
  },

  async update(data: SemesterSetting, reanalyze = true): Promise<SemesterSetting> {
    const res = await api.put<ApiResponse<SemesterSetting>>('/semester-settings', data, {
      params: { reanalyze },
    });
    return res.data.data;
  },
};

export const predictionService = {
  async getSummary(): Promise<PredictionSummary> {
    const res = await api.get<ApiResponse<PredictionSummary>>('/predictions/summary');
    return res.data.data;
  },

  async getAll(params?: { riskLevel?: string; studyProgram?: string; search?: string }): Promise<StudentPrediction[]> {
    const res = await api.get<ApiResponse<StudentPrediction[]>>('/predictions/latest', { params });
    return res.data.data || [];
  },

  async getByStudent(studentId: number): Promise<StudentPrediction | null> {
    const res = await api.get<ApiResponse<StudentPrediction | null>>(`/predictions/student/${studentId}`);
    return res.data.data;
  },

  async runAnalysis(): Promise<StudentPrediction[]> {
    const res = await api.post<ApiResponse<StudentPrediction[]>>('/predictions/analyze', {}, { timeout: 60000 });
    return res.data.data || [];
  },
};

export const followUpService = {
  async getAll(): Promise<FollowUp[]> {
    const res = await api.get<ApiResponse<FollowUp[]>>('/follow-ups');
    return res.data.data || [];
  },

  async getByStudent(studentId: number): Promise<FollowUp[]> {
    const res = await api.get<ApiResponse<FollowUp[]>>(`/follow-ups/student/${studentId}`);
    return res.data.data || [];
  },

  async create(data: {
    studentId: number;
    counselingDate: string;
    topicsDiscussed: string;
    actionPlan: string;
    status?: string;
    evaluationResult?: string;
  }) {
    const res = await api.post<ApiResponse<FollowUp>>('/follow-ups', data);
    return res.data.data;
  },

  async updateStatus(id: number, status: string, evaluationResult?: string) {
    const res = await api.patch<ApiResponse<FollowUp>>(`/follow-ups/${id}/status`, null, {
      params: { status, evaluationResult },
    });
    return res.data.data;
  },
};

export const emergencyContactService = {
  async getAll(search?: string): Promise<EmergencyContact[]> {
    const res = await api.get<ApiResponse<EmergencyContact[]>>('/emergency-contacts', {
      params: search ? { search } : undefined,
    });
    return res.data.data || [];
  },

  async create(data: {
    studentId: number;
    contactName: string;
    relationship: string;
    phoneNumber: string;
    address?: string;
  }) {
    const res = await api.post<ApiResponse<any>>('/emergency-contacts', data);
    return res.data.data;
  },
};

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const res = await api.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
    return res.data.data;
  },
};

export const reportService = {
  async downloadExcel(type: 'students' | 'predictions' | 'follow-ups' | 'welfare' | 'pdf-archive') {
    const res = await api.get(`/reports/${type}`, { responseType: 'blob' });
    return res.data as Blob;
  },
};
