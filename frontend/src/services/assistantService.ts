import api from './api';
import type { ApiResponse } from '../types';

export interface JagoChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface JagoChatResponse {
  assistantName: string;
  reply: string;
  engine: 'GEMINI' | 'LOCAL_FALLBACK' | 'GUARDRAIL' | string;
  model: string;
  outOfContext: boolean;
  sourcesUsed: string[];
  timestamp: string;
}

export interface JagoStatusResponse {
  assistantName: string;
  geminiConfigured: boolean;
  model: string;
  mode: string;
}

export const assistantService = {
  async getStatus(): Promise<JagoStatusResponse> {
    const res = await api.get<ApiResponse<JagoStatusResponse>>('/assistant/status');
    return res.data.data;
  },

  async chat(message: string, history: JagoChatTurn[]): Promise<JagoChatResponse> {
    const res = await api.post<ApiResponse<JagoChatResponse>>(
      '/assistant/chat',
      { message, history: history.slice(-8) },
      { timeout: 60000 }
    );
    return res.data.data;
  },
};
