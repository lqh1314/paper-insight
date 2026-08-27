import axios from 'axios';
import type { ApiResponse, PaperPptInfo, PaperSlide } from '@shared/api.interface';

const api = axios.create({ baseURL: '/' });

export async function generatePpt(paperId: string): Promise<{ id: string }> {
  const res = await api.post<ApiResponse<{ id: string }>>('/api/paper-ppt/generate', { paperId });
  return res.data.data;
}

export async function getPptInfo(paperId: string): Promise<PaperPptInfo> {
  const res = await api.get<ApiResponse<PaperPptInfo>>(`/api/paper-ppt/${paperId}`);
  return res.data.data;
}

export async function getPptSlides(paperId: string): Promise<PaperSlide[]> {
  const res = await api.get<ApiResponse<{ slides: PaperSlide[] }>>(`/api/paper-ppt/${paperId}/download`);
  return res.data.data.slides;
}
