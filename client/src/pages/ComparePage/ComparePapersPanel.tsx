import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { papers as papersApi } from '@client/src/api';
import type { PaperDetail } from '@shared/api.interface';

interface Props { papers: { id: string; title: string }[] }

const COMPARE_FIELDS = [
  { key: 'authors', label: '作者' },
  { key: 'abstract', label: '摘要' },
  { key: 'researchBackground', label: '研究背景' },
  { key: 'coreMethod', label: '核心方法' },
  { key: 'experimentResult', label: '实验结果' },
  { key: 'conclusion', label: '结论' },
  { key: 'innovationContribution', label: '创新点' },
] as const;

const ComparePapersPanel: React.FC<Props> = ({ papers }) => {
  const [details, setDetails] = useState<Record<string, PaperDetail>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all(papers.map(p => papersApi.getPaperDetail(p.id)))
      .then(results => {
        const map: Record<string, PaperDetail> = {};
        results.forEach(r => { map[r.id] = r; });
        setDetails(map);
      })
      .finally(() => setLoading(false));
  }, [papers]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border border-slate-200 bg-slate-50 p-3 text-left font-medium text-slate-600">对比维度</th>
            {papers.map(p => (
              <th key={p.id} className="border border-slate-200 bg-slate-50 p-3 text-left font-medium text-slate-800">
                {p.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_FIELDS.map(field => (
            <tr key={field.key}>
              <td className="border border-slate-200 bg-slate-50 p-3 font-medium text-slate-600">{field.label}</td>
              {papers.map(p => (
                <td key={p.id} className="border border-slate-200 p-3 align-top text-slate-600">
                  {(details[p.id]?.analysis as any)?.[field.key] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparePapersPanel;
