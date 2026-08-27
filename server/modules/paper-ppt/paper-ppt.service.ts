import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AiService } from '@server/common/services/ai.service';
import type { PaperSlide, PaperPptInfo } from '@shared/api.interface';
import { paper, paperAnalysis, paperPpt } from '@server/database/schema';

const PPT_SYSTEM_PROMPT = `你是一位学术演示文稿设计专家。请根据用户提供的论文内容，生成一份结构清晰的学术汇报PPT大纲。

输出格式要求（严格按此格式，不要输出其他内容）：
每页用 --- 分隔，页内第一行为标题，后续每行一个要点（用 - 开头）。

必须包含以下页面：
1. 封面页：标题写论文标题，副标题写作者
2. 目录页：列出各部分标题
3. 研究背景页
4. 核心方法页（可拆分为多页）
5. 实验结果页（可拆分为多页）
6. 结论与展望页

每页标题前用【封面】【目录】【内容】【总结】标注类型。
每页要点3-6条，每条简洁有力，不超过50字。`;

@Injectable()
export class PaperPptService {
  private readonly logger = new Logger(PaperPptService.name);

  constructor(
    @Inject(DATABASE) private readonly db: PostgresJsDatabase,
    private ai: AiService,
  ) {}

  async generate(paperId: string): Promise<string> {
    const paperRecords = await this.db.select().from(paper).where(eq(paper.id, paperId)).limit(1);
    if (paperRecords.length === 0) throw new NotFoundException('论文不存在');
    const analysisRecords = await this.db.select().from(paperAnalysis).where(eq(paperAnalysis.paperId, paperId)).limit(1);
    if (analysisRecords.length === 0) throw new BadRequestException('论文解析尚未完成');

    const existing = await this.db.select().from(paperPpt).where(eq(paperPpt.paperId, paperId)).limit(1);
    let pptId: string;
    if (existing.length === 0) {
      const inserted = await this.db.insert(paperPpt).values({
        paperId, status: 'generating', slides: { list: [] },
      }).returning({ id: paperPpt.id });
      pptId = inserted[0].id;
    } else {
      const updated = await this.db.update(paperPpt).set({
        status: 'generating', updatedAt: new Date(),
      }).where(eq(paperPpt.paperId, paperId)).returning({ id: paperPpt.id });
      pptId = updated[0].id;
    }

    void this.generatePptContentAsync(paperId, pptId);
    return pptId;
  }

  private async generatePptContentAsync(paperId: string, pptId: string): Promise<void> {
    try {
      const paperContent = await this.buildPaperContent(paperId);
      const content = await this.ai.chat(
        [
          { role: 'system', content: PPT_SYSTEM_PROMPT },
          { role: 'user', content: paperContent },
        ],
        { temperature: 0.4, maxTokens: 4096 },
      );
      const slides = this.parsePptContent(content);
      await this.db.update(paperPpt).set({
        slides: { list: slides }, status: 'completed', updatedAt: new Date(),
      }).where(eq(paperPpt.id, pptId));
      this.logger.log(`PPT生成完成: ${paperId}, 共${slides.length}页`);
    } catch (e) {
      this.logger.error(`PPT生成失败: ${(e as Error).message}`);
      await this.db.update(paperPpt).set({
        status: 'failed', updatedAt: new Date(),
      }).where(eq(paperPpt.id, pptId));
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
    const pages = content.split(/^---+\s*$/m).map(p => p.trim()).filter(Boolean);
    const slides: PaperSlide[] = [];

    for (const page of pages) {
      const lines = page.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      let type: PaperSlide['type'] = 'content';
      let titleLine = lines[0];

      // 提取类型标注
      const typeMatch = titleLine.match(/【(封面|目录|内容|总结)】/);
      if (typeMatch) {
        const typeMap: Record<string, PaperSlide['type']> = {
          '封面': 'cover', '目录': 'toc', '内容': 'content', '总结': 'summary',
        };
        type = typeMap[typeMatch[1]] || 'content';
        titleLine = titleLine.replace(/【.*?】/, '').trim();
      } else if (/封面|Cover/i.test(titleLine)) {
        type = 'cover';
      } else if (/目录|大纲/i.test(titleLine)) {
        type = 'toc';
      } else if (/总结|结论|展望/i.test(titleLine)) {
        type = 'summary';
      }

      const body = lines.slice(1)
        .map(l => l.replace(/^[-*•·]\s+/, '').replace(/^\d+[、.．)]\s+/, '').trim())
        .filter(Boolean);

      slides.push({ index: slides.length + 1, type, title: titleLine, content: body });
    }

    if (slides.length === 0) {
      slides.push({ index: 1, type: 'content', title: 'PPT内容', content: [content.trim().slice(0, 200)] });
    }
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
