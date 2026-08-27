import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { paperQa as qaApi } from '@client/src/api';
import type { QaRecord } from '@shared/api.interface';

interface Props { paperIds: string[] }

const CrossQaPanel: React.FC<Props> = ({ paperIds }) => {
  const [records, setRecords] = useState<QaRecord[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paperIds.length < 2) return;
    qaApi.getQaHistory({ paperIds, limit: 20 }).then(setRecords).catch(console.error);
  }, [paperIds]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [records]);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion(''); setLoading(true);
    try {
      const record = await qaApi.askQuestion(paperIds, q);
      setRecords(prev => [...prev, record]);
    } catch (e: any) {
      setRecords(prev => [...prev, { id: 'error', paperIds, question: q, answer: `出错了：${e?.message || '请重试'}`, createdAt: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-20rem)] flex-col rounded-lg border border-slate-200 bg-white">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {records.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <Bot className="h-10 w-10" />
            <p className="text-sm">跨论文对比问答，例如：这几篇论文在研究方法上有什么异同？</p>
          </div>
        )}
        {records.map(r => (
          <div key={r.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">{r.question}</p>
            </div>
            <div className="flex items-start gap-2">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">{r.answer}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> AI 正在综合多篇论文思考...
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="输入对比问题..." className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <button onClick={handleAsk} disabled={loading || !question.trim()}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrossQaPanel;
