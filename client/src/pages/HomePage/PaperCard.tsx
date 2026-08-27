import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import type { PaperListItem, ParseStatus } from '@shared/api.interface';

interface PaperCardProps {
  paper: PaperListItem;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

const statusConfig: Record<ParseStatus, { variant: string; label: string; pulse?: boolean }> = {
  pending: { variant: 'secondary', label: '待解析' },
  parsing: { variant: 'secondary', label: '解析中', pulse: true },
  completed: { variant: 'default', label: '已完成' },
  failed: { variant: 'destructive', label: '解析失败' },
};

const PaperCard: React.FC<PaperCardProps> = ({ paper, selectMode, selected, onToggleSelect }) => {
  const navigate = useNavigate();
  const cfg = statusConfig[paper.parseStatus];

  return (
    <div className={`flex flex-col overflow-hidden rounded-lg border bg-white transition-all hover:shadow-md ${
      selected ? 'ring-2 ring-blue-600' : ''
    }`}>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          {selectMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(paper.id)}
              className="mt-0.5 shrink-0"
            />
          )}
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <h3 className="truncate text-base font-medium text-slate-800" title={paper.title}>
              {paper.title}
            </h3>
          </div>
        </div>
        <p className="truncate text-xs text-slate-500" title={paper.fileName}>{paper.fileName}</p>
        <div className="flex items-center justify-between">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
            cfg.variant === 'destructive' ? 'bg-red-100 text-red-700' :
            cfg.variant === 'default' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          } ${cfg.pulse ? 'animate-pulse' : ''}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(paper.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => navigate(`/paper/${paper.id}`)}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          查看详情 <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PaperCard;
