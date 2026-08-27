import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Download, Loader2, FileSliders, RefreshCw } from 'lucide-react';
import { paperPpt as pptApi } from '@client/src/api';
import { generatePptxFile } from '@client/src/utils/pptx-generator';
import type { PaperDetail, PaperPptInfo } from '@shared/api.interface';

interface Props { paper: PaperDetail }

const PptPreviewPanel: React.FC<Props> = ({ paper }) => {
  const navigate = useNavigate();
  const [ppt, setPpt] = useState<PaperPptInfo | null>(paper.ppt ?? null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadPpt = useCallback(async () => {
    try {
      const data = await pptApi.getPptInfo(paper.id);
      setPpt(data);
    } catch (e) { console.error(e); }
  }, [paper.id]);

  // PPT状态轮询
  useEffect(() => {
    if (!ppt || ppt.status !== 'generating') return;
    const timer = setInterval(loadPpt, 5000);
    return () => clearInterval(timer);
  }, [ppt?.status, loadPpt]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await pptApi.generatePpt(paper.id);
      setPpt(prev => ({ ...(prev as PaperPptInfo), status: 'generating', slides: [] }));
    } catch (e: any) {
      alert(e?.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!ppt?.slides?.length) return;
    setDownloading(true);
    try {
      await generatePptxFile(ppt.slides, paper.title);
    } catch (e: any) {
      alert(e?.message || '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  if (!ppt || ppt.status === 'pending') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <FileSliders className="h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">尚未生成 PPT</p>
        <button onClick={handleGenerate} disabled={generating}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {generating ? '正在生成...' : 'AI 生成 PPT'}
        </button>
      </div>
    );
  }

  if (ppt.status === 'generating') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">AI 正在生成 PPT，请稍候...</p>
      </div>
    );
  }

  if (ppt.status === 'failed') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">PPT 生成失败</p>
        <button onClick={handleGenerate} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <RefreshCw className="h-3.5 w-3.5" /> 重新生成
        </button>
      </div>
    );
  }

  const slides = ppt.slides ?? [];
  const slide = slides[currentSlide];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">共 {slides.length} 页</span>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/ppt/${paper.id}/fullscreen`)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            <Play className="h-4 w-4" /> 全屏播放
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            下载 .pptx
          </button>
        </div>
      </div>

      <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {slide && (
          <div className="flex h-full flex-col p-8">
            <h2 className="mb-4 text-2xl font-bold text-slate-800">{slide.title}</h2>
            <ul className="space-y-2">
              {slide.content?.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" /> {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40">上一页</button>
        <span className="text-sm text-slate-500">{currentSlide + 1} / {slides.length}</span>
        <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40">下一页</button>
      </div>
    </div>
  );
};

export default PptPreviewPanel;
