import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase, CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import type { PaperSlide, PaperPptInfo } from '@shared/api.interface';
import { paper, paperAnalysis, paperPpt } from '@server/database/schema';

@Injectable()
export class PaperPptService {
  private readonly logger = new Logger(PaperPptService.name);
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
  ) {}

  async generate(paperId: string): Promise<string> {
    const paperRecords = await this.db.select().from(paper).where(eq(paper.id, paperId)).limit(1);
    if (paperRecords.length === 0) throw new NotFoundException('论文不存在');
    const analysisRecords = await this.db.select().from(paperAnalysis).where(eq(paperAnalysis.paperId, paperId)).limit(1);
    if (analysisRecords.length === 0) throw new BadRequestException('论文解析尚未完成');

    const existing = await this.db.select().from(paperPpt).where(eq(paperPpt.paperId, paperId)).limit(1);
    let pptId: string;
    if (existing.length === 0) {
      const inserted = await this.db.insert(paperPpt).values({ paperId, status: 'generating', slides: { list: [] } }).returning({ id: paperPpt.id });
      pptId = inserted[0].id;
    } else {
      const updated = await this.db.update(paperPpt).set({ status: 'generating', updatedAt: new Date() }).where(eq(paperPpt.paperId, paperId)).returning({ id: paperPpt.id });
      pptId = updated[0].id;
    }
    void this.generatePptContentAsync(paperId, pptId);
    return pptId;
  }

  private async generatePptContentAsync(paperId: string, pptId: string): Promise<void> {
    try {
      const paperContent = await this.buildPaperContent(paperId);
      const streamResult: any = this.capabilityService.load('generate_ppt_content_and_qa_from_paper_1')
        .callStream('textGenerate', { paper_content: paperContent, task_type: '生成PPT内容' });
      const stream = streamResult?.output ?? streamResult;
      let fullContent = '';
      for await (const chunk of stream) fullContent += chunk.content ?? '';
      const slides = this.parsePptContent(fullContent);
      await this.db.update(paperPpt).set({ slides: { list: slides }, status: 'completed', updatedAt: new Date() }).where(eq(paperPpt.id, pptId));
    } catch {
      await this.db.update(paperPpt).set({ status: 'failed', updatedAt: new Date() }).where(eq(paperPpt.id, pptId));
    }
  }

  private async buildPaperContent(paperId: string): Promise<string> {
    const p = (await this.db.select().from(paper).where(eq(paper.id, paperId)).limit(1))[0];
    const a = (await this.db.select().from(paperAnalysis).where(eq(paperAnalysis.paperId, paperId)).limit(1))[0];
    const parts: string[] = [`# ${p.title}`];
    if (a.authors) parts.push(`## 作者\n${a.authors}`);
    if (a.abstract) parts.push(`## 摘要\n${a.abstract}`);
    if (a.researchBackground) parts.push(`## 研究背景\n${a.researchBackground}`);
    if (a.coreMethod) parts.push(`## 核心方法\n${a.coreMethod}`);
    if (a.experimentResult) parts.push(`## 实验结果\n${a.experimentResult}`);
    if (a.conclusion) parts.push(`## 结论\n${a.conclusion}`);
    if (a.innovationContribution) parts.push(`## 创新点\n${a.innovationContribution}`);
    if (a.keywords) parts.push(`## 关键词\n${a.keywords}`);
    return parts.join('\n');
  }

  private parsePptContent(content: string): PaperSlide[] {
    const lines = content.split('\n').map(l => l.trimEnd());
    const slides: PaperSlide[] = [];
    const pageRegex = /^(#{2,3}\s+|第\s*\d+\s*页[：:]?\s*|\d+[、.．\s]+)/;
    let current: string[] = [];
    let first = true;
    const flush = () => {
      const nonEmpty = current.filter(l => l.trim());
      if (nonEmpty.length === 0) return;
      const title = nonEmpty[0].replace(/^#{1,6}\s+/, '').trim();
      const body = nonEmpty.slice(1).map(l => l.replace(/^[-*•·]\s+/, '').replace(/^\d+[、.．)]\s+/, '').trim()).filter(Boolean);
      let type: PaperSlide['type'] = 'content';
      if (/封面|Cover/i.test(title)) type = 'cover';
      else if (/目录|大纲/i.test(title)) type = 'toc';
      else if (/总结|结论|展望/i.test(title)) type = 'summary';
      slides.push({ index: slides.length + 1, type, title, content: body });
    };
    for (const line of lines) {
      if (pageRegex.test(line)) { if (!first || current.length > 0) flush(); first = false; current = [line]; }
      else current.push(line);
    }
    flush();
    if (slides.length === 0) slides.push({ index: 1, type: 'content', title: 'PPT内容', content: [content.trim().slice(0, 200)] });
    return slides;
  }

  async getPptByPaperId(paperId: string): Promise<PaperPptInfo | null> {
    const records = await this.db.select().from(paperPpt).where(eq(paperPpt.paperId, paperId)).limit(1);
    if (records.length === 0) return null;
    const r = records[0];
    const slidesData = r.slides as { list?: PaperSlide[] } | PaperSlide[];
    return {
      id: r.id, paperId: r.paperId,
      slides: Array.isArray(slidesData) ? slidesData : (slidesData?.list ?? []),
      pptFileUrl: r.pptFileUrl, status: r.status as PaperPptInfo['status'],
    };
  }
}
