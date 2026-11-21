import api from './api';
import type {
  ApiResponse,
  PageResponse,
  Student,
  StudentPointHistoryItem,
  ResidenceCategory,
} from '../types';

export const studentService = {
  async getAll(params?: {
    search?: string;
    studyProgram?: string;
    riskCategory?: string;
    residenceCategoryId?: number;
    status?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'asc' | 'desc';
  }) {
    const res = await api.get<ApiResponse<PageResponse<Student>>>('/students', { params });
    return res.data.data;
  },

  async getStudyPrograms() {
    const res = await api.get<ApiResponse<string[]>>('/students/study-programs');
    return res.data.data || [];
  },

  async getById(id: number) {
    const res = await api.get<ApiResponse<Student>>(`/students/${id}`);
    return res.data.data;
  },

  async getPointHistory(id: number) {
    const res = await api.get<ApiResponse<StudentPointHistoryItem[]>>(`/students/${id}/point-history`);
    return res.data.data || [];
  },

  async update(id: number, data: any) {
    const res = await api.put<ApiResponse<Student>>(`/students/${id}`, data);
    return res.data.data;
  },

  async addEmergencyContact(
    studentId: number,
    data: { contactName: string; relationship: string; phoneNumber: string; address?: string }
  ) {
    const res = await api.post<ApiResponse<Student>>(`/students/${studentId}/emergency-contacts`, data);
    return res.data.data;
  },

  async deleteEmergencyContact(studentId: number, contactId: number) {
    await api.delete(`/students/${studentId}/emergency-contacts/${contactId}`);
  },

  async archive(id: number) {
    await api.delete(`/students/${id}`);
  },

  async getResidenceCategories() {
    const res = await api.get<ApiResponse<ResidenceCategory[]>>('/residence-categories');
    return res.data.data || [];
  },
};
