import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { papers as papersApi } from '@client/src/api';
import type { PaperDetail, ParseStatus, ImageUnderstandingStatus } from '@shared/api.interface';
import PaperSummaryPanel from './PaperSummaryPanel';
import PptPreviewPanel from './PptPreviewPanel';
import QaPanel from './QaPanel';

type TabKey = 'summary' | 'ppt' | 'qa';

const PaperDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  const loadPaper = useCallback(async () => {
    if (!id) return;
    try {
      const data = await papersApi.getPaperDetail(id);
      setPaper(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPaper(); }, [loadPaper]);

  // 解析状态轮询：pending/parsing 时每3秒刷新
  useEffect(() => {
    if (!paper) return;
    const isParsing = paper.parseStatus === 'pending' || paper.parseStatus === 'parsing';
    if (!isParsing) return;
    const timer = setInterval(loadPaper, 3000);
    return () => clearInterval(timer);
  }, [paper?.parseStatus, loadPaper]);

  // 图片理解状态轮询
  useEffect(() => {
    if (!paper?.analysis) return;
    const status = paper.analysis.imageUnderstandingStatus;
    const isProcessing = status === 'pending' || status === 'processing';
    if (!isProcessing) return;
    const timer = setInterval(loadPaper, 3000);
    return () => clearInterval(timer);
  }, [paper?.analysis?.imageUnderstandingStatus, loadPaper]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!paper) {
    return <div className="p-6 text-center text-slate-500">论文不存在</div>;
  }

  const isParsing = paper.parseStatus === 'pending' || paper.parseStatus === 'parsing';

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-semibold text-slate-800" title={paper.title}>{paper.title}</h1>
        {isParsing && (
          <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            <Loader2 className="h-3 w-3 animate-spin" /> AI解析中...
          </span>
        )}
        {paper.parseStatus === 'completed' && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">解析完成</span>
        )}
        {paper.parseStatus === 'failed' && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">解析失败</span>
        )}
      </div>

      <div className="flex border-b border-slate-200 bg-white px-6">
        {([['summary', '要点摘要'], ['ppt', 'PPT预览'], ['qa', 'AI问答']] as [TabKey, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isParsing ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-slate-500">AI 正在解析论文，请稍候...</p>
          </div>
        ) : (
          <>
            {activeTab === 'summary' && <PaperSummaryPanel paper={paper} onRefresh={loadPaper} />}
            {activeTab === 'ppt' && <PptPreviewPanel paper={paper} />}
            {activeTab === 'qa' && <QaPanel paperIds={[paper.id]} />}
          </>
        )}
      </div>
    </div>
  );
};

export default PaperDetailPage;
