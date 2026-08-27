import React from 'react';
import { User, FileText, Lightbulb, FlaskConical, BookOpen, Target, Tags, ImageIcon, Loader2 } from 'lucide-react';
import type { PaperDetail } from '@shared/api.interface';

interface Props {
  paper: PaperDetail;
  onRefresh: () => void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
      {icon} {title}
    </h3>
    <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{children}</div>
  </div>
);

const PaperSummaryPanel: React.FC<Props> = ({ paper }) => {
  const a = paper.analysis;
  if (!a) return <div className="text-center text-slate-400">暂无解析结果</div>;

  const isImageProcessing = a.imageUnderstandingStatus === 'pending' || a.imageUnderstandingStatus === 'processing';

  return (
    <div className="space-y-4">
      <Section icon={<User className="h-4 w-4 text-blue-600" />} title="作者">{a.authors || '未提取到'}</Section>
      <Section icon={<FileText className="h-4 w-4 text-blue-600" />} title="摘要">{a.abstract || '未提取到'}</Section>
      <Section icon={<BookOpen className="h-4 w-4 text-blue-600" />} title="研究背景">{a.researchBackground || '未提取到'}</Section>
      <Section icon={<Target className="h-4 w-4 text-blue-600" />} title="核心方法">{a.coreMethod || '未提取到'}</Section>
      <Section icon={<FlaskConical className="h-4 w-4 text-blue-600" />} title="实验结果">{a.experimentResult || '未提取到'}</Section>
      <Section icon={<FileText className="h-4 w-4 text-blue-600" />} title="结论">{a.conclusion || '未提取到'}</Section>
      <Section icon={<Lightbulb className="h-4 w-4 text-blue-600" />} title="创新点与贡献">{a.innovationContribution || '未提取到'}</Section>
      <Section icon={<Tags className="h-4 w-4 text-blue-600" />} title="关键词">
        {a.keywords ? (
          <div className="flex flex-wrap gap-2">
            {a.keywords.split(/[,，、;；]/).filter(Boolean).map((kw, i) => (
              <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">{kw.trim()}</span>
            ))}
          </div>
        ) : '未提取到'}
      </Section>

      {a.images && a.images.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
            <ImageIcon className="h-4 w-4 text-blue-600" />
            论文图表 ({a.images.length})
            {isImageProcessing && (
              <span className="flex items-center gap-1 text-xs font-normal text-amber-600">
                <Loader2 className="h-3 w-3 animate-spin" /> AI正在识别图片内容...
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {a.images.map((img, i) => (
              <div key={i} className="overflow-hidden rounded-md border border-slate-200">
                <img src={img.url} alt={img.description || `图表${i + 1}`} className="h-40 w-full object-cover" />
                <div className="p-2">
                  <p className="text-xs text-slate-400">{img.chapter}</p>
                  {img.description && <p className="mt-1 text-xs text-slate-600 line-clamp-2">{img.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperSummaryPanel;
