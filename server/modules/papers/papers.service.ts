import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, ilike, or, count } from 'drizzle-orm';
import { DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { paper, paperAnalysis, paperPpt } from '@server/database/schema';
import { AiService } from '@server/common/services/ai.service';
import { DocumentParserService } from '@server/common/services/document-parser.service';
import { FileService } from '@server/common/services/file.service';
import type {
  PaperListResult, PaperListItem, PaperDetail,
  PaperAnalysis as PaperAnalysisDto, PaperPptInfo, PaperImage, ImageUnderstandingStatus,
} from '@shared/api.interface';
import * as fs from 'fs';
import * as path from 'path';

const ANALYSIS_SYSTEM_PROMPT = `你是一位学术论文分析专家。请仔细阅读用户提供的论文全文，提取以下结构化信息，并以严格的JSON格式返回（不要输出JSON以外的任何内容）：
{
  "title": "论文完整标题",
  "author": "作者列表（逗号分隔）",
  "abstract": "摘要全文",
  "research_background": "研究背景与问题（200-400字）",
  "core_method": "核心方法/模型/算法的详细描述（300-600字）",
  "experiment_result": "实验设置、数据集、主要结果与关键数据（300-600字）",
  "conclusion": "结论与未来工作（200-400字）",
  "innovation_contribution": "主要创新点与贡献（分点列出，200-400字）",
  "keywords": "关键词（逗号分隔，5-8个）"
}
如果某部分在论文中未明确提及，对应字段填空字符串。`;

@Injectable()
export class PapersService {
  private readonly logger = new Logger(PapersService.name);

  constructor(
    @Inject(DATABASE) private readonly db: PostgresJsDatabase,
    private ai: AiService,
    private documentParser: DocumentParserService,
    private fileService: FileService,
  ) {}

  async createFromUpload(
    file: Express.Multer.File,
    sourceType: 'single' | 'batch' = 'single',
    batchId?: string,
  ): Promise<string> {
    const saved = this.fileService.saveFile(file);
    const result = await this.db.insert(paper).values({
      title: file.originalname,
      fileName: file.originalname,
      filePath: saved.filePath,
      fileUrl: saved.fileUrl,
      fileType: path.extname(file.originalname).slice(1) || 'unknown',
      fileSize: saved.fileSize,
      parseStatus: 'pending',
      sourceType,
      batchId: batchId as any,
    }).returning({ id: paper.id });

    const id = result[0].id;
    // 自动开始解析
    void this.startParse(id).catch((e) => {
      this.logger.error(`自动解析失败: ${e.message}`);
    });
    return id;
  }

  async startParse(id: string): Promise<void> {
    const records = await this.db.select({
      id: paper.id, filePath: paper.filePath, fileUrl: paper.fileUrl,
      fileName: paper.fileName, fileType: paper.fileType,
    }).from(paper).where(eq(paper.id, id));
    if (records.length === 0) throw new NotFoundException('论文不存在');

    await this.db.update(paper).set({ parseStatus: 'parsing', updatedAt: new Date() }).where(eq(paper.id, id));
    const record = records[0];
    const filePath = record.filePath || this.fileService.getFilePath(path.basename(record.fileUrl));

    void this.runParseChain(id, filePath!, record.fileUrl, record.fileType ?? '', record.fileName).catch((e) => {
      this.logger.error(`解析链失败: ${e.message}`);
      void this.db.update(paper).set({ parseStatus: 'failed', updatedAt: new Date() }).where(eq(paper.id, id));
    });
  }

  private async runParseChain(id: string, filePath: string, fileUrl: string, fileType: string, fileName: string): Promise<void> {
    // 1. 文档解析为文本
    this.logger.log(`开始解析文档: ${fileName}`);
    const content = await this.documentParser.parseToText(filePath, fileUrl, fileType);
    if (!content || content.trim().length < 10) {
      throw new Error('文档内容为空或无法提取文本');
    }

    // 2. AI 结构化提取
    this.logger.log(`AI 结构化分析: ${fileName}`);
    // 截断过长文本（适配模型上下文窗口）
    const maxChars = 50000;
    const truncated = content.length > maxChars ? content.slice(0, maxChars) : content;

    const jsonStr = await this.ai.chat(
      [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: truncated },
      ],
      { temperature: 0.1, jsonMode: true, maxTokens: 4096 },
    );

    let structured: any = {};
    try {
      structured = JSON.parse(jsonStr.replace(/```json\s?|```/g, '').trim());
    } catch {
      this.logger.warn('AI返回JSON解析失败，尝试重新提取');
      throw new Error('AI 分析结果格式异常');
    }

    const title = (structured.title || '').trim() || fileName;

    // 3. 写入数据库
    await this.db.transaction(async (tx) => {
      await tx.update(paper).set({
        title, fullText: content, parseStatus: 'completed', updatedAt: new Date(),
      }).where(eq(paper.id, id));

      const existing = await tx.select({ id: paperAnalysis.id }).from(paperAnalysis).where(eq(paperAnalysis.paperId, id));
      const data = {
        authors: structured.author || '',
        abstract: structured.abstract || '',
        researchBackground: structured.research_background || '',
        coreMethod: structured.core_method || '',
        experimentResult: structured.experiment_result || '',
        conclusion: structured.conclusion || '',
        innovationContribution: structured.innovation_contribution || '',
        keywords: structured.keywords || '',
        images: { list: [] },
        updatedAt: new Date(),
      };
      if (existing.length > 0) {
        await tx.update(paperAnalysis).set(data).where(eq(paperAnalysis.paperId, id));
      } else {
        await tx.insert(paperAnalysis).values({ paperId: id, ...data });
      }
    });

    this.logger.log(`论文解析完成: ${title}`);
  }

  async list(page: number, pageSize: number, keyword?: string): Promise<PaperListResult> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const offset = (safePage - 1) * safePageSize;
    const where = keyword ? or(ilike(paper.title, `%${keyword}%`), ilike(paper.fileName, `%${keyword}%`)) : undefined;

    const [countResult, items] = await Promise.all([
      this.db.select({ count: count() }).from(paper).where(where),
      this.db.select({
        id: paper.id, title: paper.title, fileName: paper.fileName,
        fileType: paper.fileType, parseStatus: paper.parseStatus, createdAt: paper.createdAt,
      }).from(paper).where(where).orderBy(desc(paper.createdAt)).limit(safePageSize).offset(offset),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id, title: item.title, fileName: item.fileName, fileType: item.fileType ?? '',
        parseStatus: item.parseStatus as PaperListItem['parseStatus'],
        createdAt: item.createdAt.toISOString(),
      })),
      total: Number(countResult[0]?.count ?? 0), page: safePage, pageSize: safePageSize,
    };
  }

  async getDetail(id: string): Promise<PaperDetail> {
    const records = await this.db.select().from(paper).where(eq(paper.id, id)).limit(1);
    if (records.length === 0) throw new NotFoundException('论文不存在');
    const p = records[0];

    const [analysisRecords, pptRecords] = await Promise.all([
      this.db.select().from(paperAnalysis).where(eq(paperAnalysis.paperId, id)).limit(1),
      this.db.select().from(paperPpt).where(eq(paperPpt.paperId, id)).limit(1),
    ]);

    let analysis: PaperAnalysisDto | null = null;
    if (analysisRecords.length > 0) {
      const a = analysisRecords[0];
      const imagesData = (a.images as { list?: PaperImage[] } | null) ?? { list: [] };
      analysis = {
        id: a.id, paperId: a.paperId, authors: a.authors ?? '', abstract: a.abstract ?? '',
        researchBackground: a.researchBackground ?? '', coreMethod: a.coreMethod ?? '',
        experimentResult: a.experimentResult ?? '', conclusion: a.conclusion ?? '',
        innovationContribution: a.innovationContribution ?? '', keywords: a.keywords ?? '',
        images: imagesData.list ?? [],
        imageUnderstandingStatus: (a.imageUnderstandingStatus as ImageUnderstandingStatus) ?? 'pending',
      };
    }

    let ppt: PaperPptInfo | null = null;
    if (pptRecords.length > 0) {
      const r = pptRecords[0];
      const slidesData = r.slides as { list?: any[] } | any[];
      ppt = {
        id: r.id, paperId: r.paperId,
        slides: Array.isArray(slidesData) ? slidesData : (slidesData?.list ?? []),
        pptFileUrl: r.pptFileUrl, status: r.status as any,
      };
    }

    return {
      id: p.id, title: p.title, fileName: p.fileName, fileUrl: p.fileUrl, fileType: p.fileType ?? '',
      parseStatus: p.parseStatus as any, sourceType: p.sourceType,
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(), analysis, ppt,
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.db.delete(paper).where(eq(paper.id, id)).returning({ id: paper.id, filePath: paper.filePath });
    if (result.length === 0) throw new NotFoundException('论文不存在');
    // 删除本地文件
    if (result[0].filePath && fs.existsSync(result[0].filePath)) {
      try { fs.unlinkSync(result[0].filePath); } catch { /* ignore */ }
    }
  }

  async saveImages(id: string, images: PaperImage[]): Promise<void> {
    const existing = await this.db.select({ id: paperAnalysis.id, images: paperAnalysis.images })
      .from(paperAnalysis).where(eq(paperAnalysis.paperId, id)).limit(1);
    if (existing.length === 0) {
      await this.db.insert(paperAnalysis).values({ paperId: id, images: { list: images } });
      return;
    }
    const current = (existing[0].images as { list?: PaperImage[] }) ?? { list: [] };
    const merged = new Map([...(current.list ?? []), ...images].map(img => [img.id, img]));
    await this.db.update(paperAnalysis).set({
      images: { list: Array.from(merged.values()) }, updatedAt: new Date(),
    }).where(eq(paperAnalysis.paperId, id));
  }

  async startImageUnderstanding(id: string): Promise<void> {
    const records = await this.db.select({ images: paperAnalysis.images })
      .from(paperAnalysis).where(eq(paperAnalysis.paperId, id)).limit(1);
    if (records.length === 0) return;
    const images = ((records[0].images as { list?: PaperImage[] }) ?? { list: [] }).list ?? [];
    if (images.length === 0) return;

    await this.db.update(paperAnalysis).set({
      imageUnderstandingStatus: 'processing', updatedAt: new Date(),
    }).where(eq(paperAnalysis.paperId, id));

    void this.runImageUnderstanding(id, images).catch(() => {
      void this.db.update(paperAnalysis).set({
        imageUnderstandingStatus: 'failed', updatedAt: new Date(),
      }).where(eq(paperAnalysis.paperId, id));
    });
  }

  private async runImageUnderstanding(id: string, images: PaperImage[]): Promise<void> {
    const updated = [...images];
    for (const img of updated) {
      try {
        const description = await this.ai.analyzeImage(
          img.url,
          `这是学术论文中的一张${img.type || '图片/图表'}（位于${img.chapter}）。请用100-200字描述这张图的内容、类型（流程图/数据表/实验结果图/模型架构图等）和它表达的关键信息。`,
        );
        img.description = description;
      } catch (e) {
        this.logger.error(`图片理解失败: ${(e as Error).message}`);
      }
    }
    await this.db.update(paperAnalysis).set({
      images: { list: updated }, imageUnderstandingStatus: 'completed', updatedAt: new Date(),
    }).where(eq(paperAnalysis.paperId, id));
  }

  async getFileBuffer(id: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const records = await this.db.select({
      filePath: paper.filePath, fileUrl: paper.fileUrl, fileType: paper.fileType,
    }).from(paper).where(eq(paper.id, id)).limit(1);
    if (records.length === 0) throw new NotFoundException('论文不存在');
    const record = records[0];
    const filePath = record.filePath || this.fileService.getFilePath(path.basename(record.fileUrl));
    if (!fs.existsSync(filePath)) throw new NotFoundException('文件不存在');
    const buffer = fs.readFileSync(filePath);
    const ext = (record.fileType || '').toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain', md: 'text/markdown',
    };
    return { buffer, mimeType: mimeMap[ext] || 'application/octet-stream' };
  }
}
