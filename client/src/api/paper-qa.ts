import axios from 'axios';
import type { ApiResponse, QaRecord } from '@shared/api.interface';

const api = axios.create({ baseURL: '/' });

export async function askQuestion(paperIds: string[], question: string): Promise<QaRecord> {
  const res = await api.post<ApiResponse<QaRecord>>('/api/paper-qa/ask', { paperIds, question });
  return res.data.data;
}

export async function getQaHistory(params: {
  paperId?: string;
  paperIds?: string[];
  limit?: number;
}): Promise<QaRecord[]> {
  const queryParams: Record<string, string> = {};
  if (params.paperId) queryParams.paperId = params.paperId;
  if (params.paperIds && params.paperIds.length > 0) {
    queryParams.paperIds = params.paperIds.join(',');
  }
  if (params.limit !== undefined) queryParams.limit = String(params.limit);
  const res = await api.get<ApiResponse<QaRecord[]>>('/api/paper-qa/history', { params: queryParams });
  return res.data.data;
}
