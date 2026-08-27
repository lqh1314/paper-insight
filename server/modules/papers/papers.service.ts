import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase, CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, ilike, or, count } from 'drizzle-orm';
import { paper, paperAnalysis, paperPpt } from '@server/database/schema';
import type {
  UploadPaperRequest, PaperListResult, PaperListItem, PaperDetail,
  PaperAnalysis as PaperAnalysisDto, PaperPptInfo, PaperImage, ImageUnderstandingStatus,
} from '@shared/api.interface';

@Injectable()
export class PapersService {
  private readonly logger = new Logger(PapersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
  ) {}

  async create(dto: UploadPaperRequest, userId: string): Promise<string> {
    const result = await this.db.insert(paper).values({
      title: dto.fileName, fileName: dto.fileName, fileUrl: dto.fileUrl,
      fileType: dto.fileType, fileSize: dto.fileSize, parseStatus: 'pending',
      sourceType: dto.sourceType ?? 'single', batchId: dto.batchId,
    }).returning({ id: paper.id });
    return result[0].id;
  }

  async startParse(id: string, userId: string): Promise<void> {
    const paperRecord = await this.db.select({ id: paper.id, fileUrl: paper.fileUrl, fileName: paper.fileName })
      .from(paper).where(eq(paper.id, id));
    if (paperRecord.length === 0) throw new NotFoundException('论文不存在');

    await this.db.update(paper).set({ parseStatus: 'parsing', updatedAt: new Date() }).where(eq(paper.id, id));
    const { fileUrl, fileName } = paperRecord[0];
    void this.runParseChain(id, fileUrl, fileName, userId).catch(() => {
      void this.db.update(paper).set({ parseStatus: 'failed', updatedAt: new Date() }).where(eq(paper.id, id));
    });
  }

  private async runParseChain(id: string, fileUrl: string, fileName: string, userId: string): Promise<void> {
    const docParser = this.capabilityService.load('parse_academic_paper_file_1');
    const parseResult = await docParser.call('parseDocToMarkdown', { academic_paper_file: [fileUrl] }) as any;
    const content: string = parseResult.content;

    const textToJson = this.capabilityService.load('paper_text_to_structured_json_1');
    const structuredResult = await textToJson.call('textToJson', { paper_text: content }) as any;

    const title = structuredResult.title?.trim() || fileName;

    await this.db.transaction(async (tx) => {
      await tx.update(paper).set({ title, fullText: content, parseStatus: 'completed', updatedAt: new Date() }).where(eq(paper.id, id));
      const existing = await tx.select({ id: paperAnalysis.id }).from(paperAnalysis).where(eq(paperAnalysis.paperId, id));
      const data = {
        authors: structuredResult.author, abstract: structuredResult.abstract,
        researchBackground: structuredResult.research_background, coreMethod: structuredResult.core_method,
        experimentResult: structuredResult.experiment_result, conclusion: structuredResult.conclusion,
        innovationContribution: structuredResult.innovation_contribution, keywords: structuredResult.keywords,
        images: { list: [] }, updatedAt: new Date(),
      };
      if (existing.length > 0) {
        await tx.update(paperAnalysis).set(data).where(eq(paperAnalysis.paperId, id));
      } else {
        await tx.insert(paperAnalysis).values({ paperId: id, ...data, createdBy: userId });
      }
    });
  }

  async list(page: number, pageSize: number, keyword?: string): Promise<PaperListResult> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const offset = (safePage - 1) * safePageSize;
    const where = keyword ? or(ilike(paper.title, `%${keyword}%`), ilike(paper.fileName, `%${keyword}%`)) : undefined;

    const [countResult, items] = await Promise.all([
      this.db.select({ count: count() }).from(paper).where(where),
      this.db.select({ id: paper.id, title: paper.title, fileName: paper.fileName, fileType: paper.fileType, parseStatus: paper.parseStatus, createdAt: paper.createdAt })
        .from(paper).where(where).orderBy(desc(paper.createdAt)).limit(safePageSize).offset(offset),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id, title: item.title, fileName: item.fileName, fileType: item.fileType ?? '',
        parseStatus: item.parseStatus as PaperListItem['parseStatus'], createdAt: item.createdAt.toISOString(),
      })),
      total: Number(countResult[0]?.count ?? 0), page: safePage, pageSize: safePageSize,
    };
  }

  async getDetail(id: string): Promise<PaperDetail> {
    const paperRecords = await this.db.select().from(paper).where(eq(paper.id, id)).limit(1);
    if (paperRecords.length === 0) throw new NotFoundException('论文不存在');
    const p = paperRecords[0];

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
      ppt = { id: r.id, paperId: r.paperId, slides: Array.isArray(slidesData) ? slidesData : (slidesData?.list ?? []), pptFileUrl: r.pptFileUrl, status: r.status as any };
    }

    return {
      id: p.id, title: p.title, fileName: p.fileName, fileUrl: p.fileUrl, fileType: p.fileType ?? '',
      parseStatus: p.parseStatus as any, sourceType: p.sourceType,
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(), analysis, ppt,
    };
  }

  async remove(id: string, _userId: string): Promise<void> {
    const result = await this.db.delete(paper).where(eq(paper.id, id)).returning({ id: paper.id });
    if (result.length === 0) throw new NotFoundException('论文不存在');
  }

  async saveImages(id: string, images: PaperImage[], userId: string): Promise<void> {
    const existing = await this.db.select({ id: paperAnalysis.id, images: paperAnalysis.images })
      .from(paperAnalysis).where(eq(paperAnalysis.paperId, id)).limit(1);
    if (existing.length === 0) {
      await this.db.insert(paperAnalysis).values({ paperId: id, images: { list: images }, createdBy: userId, updatedBy: userId });
      return;
    }
    const current = (existing[0].images as { list?: PaperImage[] }) ?? { list: [] };
    const merged = new Map([...(current.list ?? []), ...images].map(img => [img.id, img]));
    await this.db.update(paperAnalysis).set({ images: { list: Array.from(merged.values()) }, updatedAt: new Date() }).where(eq(paperAnalysis.paperId, id));
  }

  async startImageUnderstanding(id: string, userId: string): Promise<void> {
    const records = await this.db.select({ images: paperAnalysis.images }).from(paperAnalysis).where(eq(paperAnalysis.paperId, id)).limit(1);
    if (records.length === 0) return;
    const images = ((records[0].images as { list?: PaperImage[] }) ?? { list: [] }).list ?? [];
    if (images.length === 0) return;

    await this.db.update(paperAnalysis).set({ imageUnderstandingStatus: 'processing', updatedAt: new Date() }).where(eq(paperAnalysis.paperId, id));
    void this.runImageUnderstanding(id, images, userId).catch(() => {
      void this.db.update(paperAnalysis).set({ imageUnderstandingStatus: 'failed', updatedAt: new Date() }).where(eq(paperAnalysis.paperId, id));
    });
  }

  private async runImageUnderstanding(id: string, images: PaperImage[], _userId: string): Promise<void> {
    const byChapter = new Map<string, PaperImage[]>();
    images.forEach(img => {
      const list = byChapter.get(img.chapter) ?? [];
      list.push(img); byChapter.set(img.chapter, list);
    });

    const plugin = this.capabilityService.load('academic_paper_image_understand_1');
    const updated = [...images];

    for (const [chapter, chapterImages] of byChapter) {
      try {
        let content = '';
        const stream = plugin.callStream('imageUnderstanding', { paper_images: chapterImages.map(i => i.url), chapter_info: chapter }) as any;
        const iter = stream?.output ?? stream;
        for await (const chunk of iter) content += chunk.content ?? '';
        chapterImages.forEach((img, idx) => {
          const target = updated.find(i => i.id === img.id);
          if (target) target.description = content.split('\n').map(l => l.trim()).filter(Boolean)[idx] || content.slice(0, 200);
        });
      } catch (e) { this.logger.error(`图片理解失败: ${chapter}`); }
    }

    await this.db.update(paperAnalysis).set({ images: { list: updated }, imageUnderstandingStatus: 'completed', updatedAt: new Date() }).where(eq(paperAnalysis.paperId, id));
  }

  async getFileBuffer(id: string): Promise<Buffer> {
    const records = await this.db.select({ fileUrl: paper.fileUrl, fileType: paper.fileType }).from(paper).where(eq(paper.id, id)).limit(1);
    if (records.length === 0) throw new NotFoundException('论文不存在');
    if ((records[0].fileType ?? '').toLowerCase() !== 'pdf') throw new BadRequestException('仅支持 PDF 文件');
    const response = await fetch(records[0].fileUrl);
    if (!response.ok) throw new BadRequestException('文件获取失败');
    return Buffer.from(await response.arrayBuffer());
  }
}
