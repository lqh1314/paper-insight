import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AiService } from './ai.service';

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  constructor(
    private config: ConfigService,
    private ai: AiService,
  ) {}

  /**
   * 解析文档为纯文本
   * @param filePath 本地文件路径
   * @param fileUrl 文件可访问URL（图片用）
   * @param fileType 文件扩展名
   */
  async parseToText(filePath: string, fileUrl: string, fileType: string): Promise<string> {
    const type = (fileType || '').toLowerCase();

    switch (type) {
      case 'pdf':
        return this.parsePdf(filePath);
      case 'docx':
      case 'doc':
        return this.parseDocx(filePath);
      case 'txt':
      case 'md':
      case 'markdown':
        return fs.readFileSync(filePath, 'utf-8');
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'bmp':
        return this.parseImage(fileUrl);
      default:
        // 尝试按文本读取
        try {
          return fs.readFileSync(filePath, 'utf-8');
        } catch {
          throw new Error(`不支持的文件格式: ${type}`);
        }
    }
  }

  private async parsePdf(filePath: string): Promise<string> {
    try {
      // 动态 import pdf-parse（避免测试环境加载问题）
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (e) {
      this.logger.error(`PDF解析失败: ${(e as Error).message}`);
      // 降级：尝试用 pdfjs-dist 提取
      return this.parsePdfWithPdfjs(filePath);
    }
  }

  private async parsePdfWithPdfjs(filePath: string): Promise<string> {
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data, useWorker: false }).promise;
    const texts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      texts.push(content.items.map((item: any) => item.str).join(' '));
    }
    return texts.join('\n');
  }

  private async parseDocx(filePath: string): Promise<string> {
    const mammoth = await import('mammoth');
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  private async parseImage(fileUrl: string): Promise<string> {
    // 如果是本地路径，转换为可访问 URL
    const baseUrl = this.config.get<string>('FILE_BASE_URL', 'http://localhost:3000');
    const accessibleUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`;

    return this.ai.analyzeImage(
      accessibleUrl,
      '请识别并提取这张图片中的所有文字内容。如果这是一张学术论文的截图或照片，请完整提取论文文字，包括标题、作者、摘要、正文、公式、图表说明等。保持原文结构，用纯文本输出。',
    );
  }
}
