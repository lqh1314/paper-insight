/* 前后端共享的类型定义 */

export type ParseStatus = 'pending' | 'parsing' | 'completed' | 'failed';
export type PptStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ImageUnderstandingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PaperImage {
  id: string;
  url: string;
  description: string;
  chapter: string;
  type: string;
}

export interface PaperSlide {
  index: number;
  type: 'cover' | 'toc' | 'content' | 'summary';
  title: string;
  content: string[];
  notes?: string;
}

export interface PaperListItem {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  parseStatus: ParseStatus;
  createdAt: string;
}

export interface PaperDetail {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  parseStatus: ParseStatus;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
  analysis?: PaperAnalysis | null;
  ppt?: PaperPptInfo | null;
}

export interface PaperAnalysis {
  id: string;
  paperId: string;
  authors: string;
  abstract: string;
  researchBackground: string;
  coreMethod: string;
  experimentResult: string;
  conclusion: string;
  innovationContribution: string;
  keywords: string;
  images: PaperImage[];
  imageUnderstandingStatus: ImageUnderstandingStatus;
}

export interface PaperPptInfo {
  id: string;
  paperId: string;
  slides: PaperSlide[];
  pptFileUrl: string | null;
  status: PptStatus;
}

export interface QaRecord {
  id: string;
  paperIds: string[];
  question: string;
  answer: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaperListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface PaperListResult {
  items: PaperListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadPaperRequest {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  sourceType?: 'single' | 'batch';
  batchId?: string;
}

export interface GeneratePptRequest {
  paperId: string;
}

export interface SavePaperImagesRequest {
  images: PaperImage[];
}

export interface AskQuestionRequest {
  paperIds: string[];
  question: string;
}

export interface QaListParams {
  paperId?: string;
  paperIds?: string[];
  limit?: number;
}
