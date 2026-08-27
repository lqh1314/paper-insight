import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { paperPpt as pptApi } from '@client/src/api';
import type { PaperSlide } from '@shared/api.interface';

const PptFullscreenPage: React.FC = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const [slides, setSlides] = useState<PaperSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!paperId) return;
    pptApi.getPptInfo(paperId).then(data => setSlides(data?.slides ?? [])).catch(console.error);
  }, [paperId]);

  const next = useCallback(() => setCurrent(c => Math.min(slides.length - 1, c + 1)), [slides.length]);
  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, navigate]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [playing, next]);

  const slide = slides[current];

  return (
    <div className="relative flex h-screen w-screen flex-col bg-slate-900 text-white">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <button onClick={() => setPlaying(!playing)} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button onClick={() => navigate(-1)} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-12">
        {slide ? (
          <div className="flex h-full w-full max-w-5xl flex-col justify-center rounded-lg bg-white p-12 text-slate-800 shadow-2xl">
            <h1 className="mb-6 text-4xl font-bold">{slide.title}</h1>
            <ul className="space-y-3">
              {slide.content?.map((item, i) => (
                <li key={i} className="flex gap-3 text-lg text-slate-600">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" /> {item}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-slate-400">暂无幻灯片</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 pb-6">
        <button onClick={prev} disabled={current === 0} className="rounded-full bg-white/10 p-2 hover:bg-white/20 disabled:opacity-30">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-sm text-slate-300">{current + 1} / {slides.length}</span>
        <button onClick={next} disabled={current === slides.length - 1} className="rounded-full bg-white/10 p-2 hover:bg-white/20 disabled:opacity-30">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default PptFullscreenPage;
