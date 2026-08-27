import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { papers as papersApi } from '@client/src/api';
import { extractImagesFromPdf } from '@client/src/utils/pdf-image-extractor';
import type { PaperImage } from '@shared/api.interface';

interface UploadZoneProps { onUploadSuccess: () => void }

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess }) => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploading(true); setError('');

    try {
      let lastPaperId = '';
      // 文件夹上传：检测是否为多篇论文批量（多个文档类文件）
      const docFiles = fileArray.filter(f => /\.(pdf|docx?|txt|md|png|jpe?g)$/i.test(f.name));
      const isBatch = docFiles.length > 1;

      for (const file of docFiles) {
        setProgress(`正在上传: ${file.name}`);
        // 模拟上传到云存储（实际环境中使用平台上传SDK）
        const fileUrl = URL.createObjectURL(file);
        const uploadRes = await papersApi.uploadPaper({
          fileName: file.name,
          fileUrl,
          fileType: file.name.split('.').pop() || 'unknown',
          fileSize: file.size,
          sourceType: isBatch ? 'batch' : 'single',
        });
        lastPaperId = uploadRes.id;

        setProgress(`正在解析: ${file.name}`);
        await papersApi.parsePaper(uploadRes.id);

        // PDF文件：前端提取图片并上传
        if (file.name.toLowerCase().endsWith('.pdf')) {
          try {
            setProgress(`正在提取图表: ${file.name}`);
            const images = await extractImagesFromPdf(uploadRes.id, fileUrl);
            if (images.length > 0) {
              await papersApi.saveImages(uploadRes.id, images);
              // 启动后端AI图片理解
              await papersApi.startImageUnderstanding(uploadRes.id);
            }
          } catch (e) {
            console.warn('PDF图片提取失败:', e);
          }
        }
      }

      setProgress('上传完成，正在跳转...');
      onUploadSuccess();
      // 单篇上传直接跳转到详情页；批量上传跳转最后一篇
      if (lastPaperId) navigate(`/paper/${lastPaperId}`);
    } catch (e: any) {
      setError(e?.message || '上传失败，请重试');
    } finally {
      setUploading(false); setProgress('');
    }
  }, [navigate, onUploadSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const items = e.dataTransfer.items;
    if (items && items[0]?.webkitGetAsEntry?.()?.isDirectory) {
      // 文件夹上传
      const entry = items[0].webkitGetAsEntry() as any;
      const files: File[] = [];
      const reader = entry.createReader();
      const readEntries = () => {
        reader.readEntries(async (entries: any[]) => {
          if (entries.length === 0) { handleFiles(files); return; }
          for (const ent of entries) {
            if (ent.isFile) {
              ent.file((f: File) => files.push(f));
            }
          }
          readEntries();
        });
      };
      readEntries();
    } else {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition-colors hover:border-blue-400">
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">{progress}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError('')} className="text-sm text-blue-600 hover:underline">重试</button>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer flex-col items-center gap-3 ${dragOver ? 'opacity-70' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="rounded-full bg-blue-50 p-4">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <p className="text-base font-medium text-slate-800">拖拽文件或文件夹到此处上传</p>
            <p className="mt-1 text-xs text-slate-500">支持 PDF、Word、图片、TXT、Markdown · 单篇材料包或多篇批量均可</p>
          </div>
          <span className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">选择文件</span>
          <input type="file" multiple hidden accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        </label>
      )}
    </div>
  );
};
