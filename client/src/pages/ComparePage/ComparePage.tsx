import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { papers as papersApi } from '@client/src/api';
import type { PaperListItem } from '@shared/api.interface';
import ComparePapersPanel from './ComparePapersPanel';
import CrossQaPanel from './CrossQaPanel';

type TabKey = 'compare' | 'qa';

const ComparePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('compare');

  useEffect(() => {
    const idsParam = searchParams.get('ids');
    if (idsParam) setSelectedIds(idsParam.split(',').filter(Boolean));
    papersApi.getPaperList({ page: 1, pageSize: 50 }).then(res => {
      setPapers(res.items);
    }).finally(() => setLoading(false));
  }, [searchParams]);

  const selectedPapers = useMemo(
    () => papers.filter(p => selectedIds.includes(p.id)),
    [papers, selectedIds]
  );

  const togglePaper = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">论文对比</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {papers.map(p => (
          <button key={p.id} onClick={() => togglePaper(p.id)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              selectedIds.includes(p.id)
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}>
            {p.title}
          </button>
        ))}
      </div>

      {selectedIds.length < 2 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
          请至少选择 2 篇论文进行对比
        </div>
      ) : (
        <>
          <div className="mb-4 flex border-b border-slate-200">
            {([['compare', '要点对比'], ['qa', '跨论文问答']] as [TabKey, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`border-b-2 px-4 py-2 text-sm font-medium ${
                  activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {activeTab === 'compare' && <ComparePapersPanel papers={selectedPapers} />}
          {activeTab === 'qa' && <CrossQaPanel paperIds={selectedIds} />}
        </>
      )}
    </div>
  );
};

export default ComparePage;
