import axios from 'axios';
import type {
  ApiResponse, PaperListResult, PaperDetail, PaperImage,
} from '@shared/api.interface';

const api = axios.create({ baseURL: '/' });

export async function getPaperList(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<PaperListResult> {
  const res = await api.get<ApiResponse<PaperListResult>>('/api/papers', { params });
  return res.data.data;
}

export async function getPaperDetail(id: string): Promise<PaperDetail> {
  const res = await api.get<ApiResponse<PaperDetail>>(`/api/papers/${id}`);
  return res.data.data;
}

/**
 * 上传论文文件（multipart/form-data）
 * 上传后后端自动开始解析
 */
export async function uploadPaper(
  file: File,
  sourceType: 'single' | 'batch' = 'single',
  batchId?: string,
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sourceType', sourceType);
  if (batchId) formData.append('batchId', batchId);
  const res = await api.post<ApiResponse<{ id: string }>>('/api/papers/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function parsePaper(id: string): Promise<void> {
  await api.post(`/api/papers/${id}/parse`);
}

export async function saveImages(id: string, images: PaperImage[]): Promise<void> {
  await api.post(`/api/papers/${id}/images`, { images });
}

export async function startImageUnderstanding(id: string): Promise<void> {
  await api.post(`/api/papers/${id}/image-understanding`);
}
