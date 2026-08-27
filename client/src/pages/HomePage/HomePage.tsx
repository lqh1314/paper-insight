import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, GitCompare, X } from 'lucide-react';
import { UploadZone } from './UploadZone';
import PaperCard from './PaperCard';
import { papers as papersApi } from '@client/src/api';
import type { PaperListItem } from '@shared/api.interface';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await papersApi.getPaperList({ page: 1, pageSize: 50, keyword });
      setPapers(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => { loadPapers(); }, [loadPapers]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">工作台</h1>
        <p className="mt-1 text-sm text-slate-500">上传学术论文，AI 自动解析要点、生成 PPT、智能问答</p>
      </div>

      <UploadZone onUploadSuccess={loadPapers} />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">历史论文</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text" placeholder="搜索论文..." value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="rounded-md border border-slate-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
              selectMode ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GitCompare className="h-4 w-4" /> {selectMode ? '取消选择' : '选择对比'}
          </button>
          {selectMode && selectedIds.size >= 2 && (
            <button
              onClick={() => navigate(`/compare?ids=${Array.from(selectedIds).join(',')}`)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              对比 ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="col-span-full text-center text-sm text-slate-400">加载中...</p>
        ) : papers.length === 0 ? (
          <p className="col-span-full text-center text-sm text-slate-400">暂无论文，请上传</p>
        ) : (
          papers.map(p => (
            <PaperCard key={p.id} paper={p} selectMode={selectMode} selected={selectedIds.has(p.id)} onToggleSelect={toggleSelect} />
          ))
        )}
      </div>
    </div>
  );
};

export default HomePage;
