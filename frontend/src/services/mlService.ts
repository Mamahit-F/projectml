import api from './api';
import type { ApiResponse } from '../types';

export const mlService = {
  async getStatus(): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/status');
    return res.data.data;
  },

  async getDatasetSummary(datasetVersion?: string): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/dataset/summary', {
      params: datasetVersion ? { datasetVersion } : undefined,
    });
    return res.data.data;
  },

  async getDatasetQuality(datasetVersion?: string): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/dataset/quality', {
      params: datasetVersion ? { datasetVersion } : undefined,
    });
    return res.data.data;
  },

  async getStudentsContinuity(params?: {
    datasetVersion?: string;
    status?: string;
    search?: string;
    faculty?: string;
    eligibleFor?: string;
    page?: number;
    size?: number;
  }): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/students/continuity', { params });
    return res.data.data;
  },

  async processData(body?: { data_dir?: string; use_cache?: boolean }): Promise<any> {
    const res = await api.post<ApiResponse<any>>('/ml/process-data', body || {}, {
      timeout: 120000,
    });
    return res.data.data;
  },

  async trainClustering(body?: {
    k_min?: number;
    k_max?: number;
    preferred_k?: number | null;
    include_alternatives?: boolean;
    random_state?: number;
  }): Promise<any> {
    const res = await api.post<ApiResponse<any>>('/ml/train/clustering', body || {}, {
      timeout: 120000,
    });
    return res.data.data;
  },

  async trainPrediction(body?: {
    task?: 'BOTH' | 'REGRESSION' | 'CLASSIFICATION';
    algorithms?: string[];
    custom_thresholds?: { low_max: number; medium_max: number } | null;
    hyperparameters?: Record<string, any>;
    random_state?: number;
  }): Promise<any> {
    const res = await api.post<ApiResponse<any>>('/ml/train/prediction', body || {}, {
      timeout: 120000,
    });
    return res.data.data;
  },

  async trainAll(body?: { reprocess_data?: boolean; auto_select_if_none?: boolean }): Promise<any> {
    const res = await api.post<ApiResponse<any>>('/ml/train/all', body || {}, {
      timeout: 180000,
    });
    return res.data.data;
  },

  async listModels(modelType?: string): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/models', {
      params: modelType ? { modelType } : undefined,
    });
    return res.data.data;
  },

  async compareModels(modelType?: string): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/models/compare', {
      params: modelType ? { modelType } : undefined,
    });
    return res.data.data;
  },

  async getSelectedModels(): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/models/selected');
    return res.data.data;
  },

  async selectModel(modelId: string, notes?: string): Promise<any> {
    const res = await api.post<ApiResponse<any>>('/ml/models/select', {
      model_id: modelId,
      notes,
    });
    return res.data.data;
  },

  async predictStudent(body: {
    nim?: string;
    internal_student_id?: string;
    next_is_same_semester?: boolean;
    expected_days_to_next?: number;
    allow_inactive_preview?: boolean;
  }): Promise<any> {
    const res = await api.post<ApiResponse<any>>('/ml/predict', body, { timeout: 60000 });
    return res.data.data;
  },

  async predictBatch(body?: {
    nims?: string[];
    next_is_same_semester?: boolean;
    expected_days_to_next?: number;
    limit?: number;
  }): Promise<any> {
    const res = await api.post<ApiResponse<any>>('/ml/predict/batch', body || {}, { timeout: 90000 });
    return res.data.data;
  },

  async getTrainingHistory(): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/training/history');
    return res.data.data;
  },

  async getClusters(modelId?: string, sampleLimit = 450): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/clusters', {
      params: { ...(modelId ? { modelId } : {}), sampleLimit },
    });
    return res.data.data;
  },

  async getEvaluation(): Promise<any> {
    const res = await api.get<ApiResponse<any>>('/ml/evaluation');
    return res.data.data;
  },
};
