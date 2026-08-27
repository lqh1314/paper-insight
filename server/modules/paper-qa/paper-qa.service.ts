import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, desc, inArray, sql } from 'drizzle-orm';
import { DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AiService } from '@server/common/services/ai.service';
import { paperQa, paper, paperAnalysis } from '@server/database/schema';
import type { QaRecord, AskQuestionRequest, QaListParams } from '@shared/api.interface';

const QA_SYSTEM_PROMPT = `你是一位学术论文助手。请基于用户提供的论文内容回答问题。
要求：
1. 只基于论文内容回答，不要编造论文中没有的信息
2. 如果论文中没有相关信息，明确告知用户
3. 回答准确、简洁、有条理，可引用论文中的关键数据
4. 多篇论文对比时，明确指出异同点
5. 使用中文回答`;

@Injectable()
export class PaperQaService {
  private readonly logger = new Logger(PaperQaService.name);

  constructor(
    @Inject(DATABASE) private readonly db: PostgresJsDatabase,
    private ai: AiService,
  ) {}

  async askQuestion(params: AskQuestionRequest): Promise<QaRecord> {
    const { paperIds, question } = params;
    if (!paperIds?.length) throw new BadRequestException('paperIds 不能为空');
    if (!question?.trim()) throw new BadRequestException('问题不能为空');

    const papers = await this.db.select().from(paper).where(inArray(paper.id, paperIds));
    if (papers.length === 0) throw new BadRequestException('未找到指定的论文');
    const analyses = await this.db.select().from(paperAnalysis).where(inArray(paperAnalysis.paperId, paperIds));
    const analysisMap = new Map(analyses.map(a => [a.paperId, a]));

    const parts: string[] = [];
    for (const p of papers) {
      const a = analysisMap.get(p.id);
      const section: string[] = [`=== ${p.title} ===`];
      if (a?.authors) section.push(`作者：${a.authors}`);
      if (a?.abstract) section.push(`摘要：${a.abstract}`);
      if (a?.researchBackground) section.push(`研究背景：${a.researchBackground}`);
      if (a?.coreMethod) section.push(`核心方法：${a.coreMethod}`);
      if (a?.experimentResult) section.push(`实验结果：${a.experimentResult}`);
      if (a?.conclusion) section.push(`结论：${a.conclusion}`);
      if (a?.innovationContribution) section.push(`创新点：${a.innovationContribution}`);
      if (p.fullText) section.push(`全文：${p.fullText.slice(0, 30000)}`);
      parts.push(section.join('\n'));
    }

    let answer = '';
    const stream = this.ai.chatStream([
      { role: 'system', content: QA_SYSTEM_PROMPT },
      { role: 'user', content: `${parts.join('\n\n')}\n\n用户问题：${question}` },
    ], { temperature: 0.3, maxTokens: 2048 });

    for await (const chunk of stream) answer += chunk;
    if (!answer.trim()) throw new BadRequestException('AI 生成回答为空，请重试');

    const inserted = await this.db.insert(paperQa).values({ paperIds, question, answer }).returning();
    const r = inserted[0];
    return {
      id: r.id, paperIds: r.paperIds as string[], question: r.question,
      answer: r.answer, createdAt: r.createdAt.toISOString(),
    };
  }

  async getHistory(params: QaListParams): Promise<QaRecord[]> {
    const { paperId, paperIds, limit } = params;
    const limitNum = limit ? Math.min(limit, 100) : 20;
    const targetIds = paperIds?.length ? paperIds : paperId ? [paperId] : [];

    const rows = targetIds.length > 0
      ? await this.db.select().from(paperQa)
          .where(sql`${paperQa.paperIds} @> ARRAY[${sql.join(targetIds.map(id => sql`${id}`), sql`, `)}]::uuid[]`)
          .orderBy(desc(paperQa.createdAt)).limit(limitNum)
      : await this.db.select().from(paperQa).orderBy(desc(paperQa.createdAt)).limit(limitNum);

    return rows.map(r => ({
      id: r.id, paperIds: r.paperIds as string[], question: r.question,
      answer: r.answer, createdAt: r.createdAt.toISOString(),
    }));
  }

  async getById(id: string): Promise<QaRecord> {
    const rows = await this.db.select().from(paperQa).where(eq(paperQa.id, id)).limit(1);
    if (rows.length === 0) throw new NotFoundException('问答记录不存在');
    const r = rows[0];
    return {
      id: r.id, paperIds: r.paperIds as string[], question: r.question,
      answer: r.answer, createdAt: r.createdAt.toISOString(),
    };
  }
}
