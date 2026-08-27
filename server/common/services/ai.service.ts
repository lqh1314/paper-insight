import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly visionModel: string;

  constructor(private config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.get<string>('AI_API_KEY', 'sk-placeholder'),
      baseURL: config.get<string>('AI_BASE_URL', 'https://api.openai.com/v1'),
    });
    this.model = config.get<string>('AI_MODEL', 'gpt-4o-mini');
    this.visionModel = config.get<string>('AI_VISION_MODEL', '') || this.model;
  }

  /**
   * 非流式对话补全
   */
  async chat(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  /**
   * 流式对话补全，返回 async iterator
   */
  async *chatStream(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  /**
   * 图片理解（视觉模型）
   */
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.visionModel,
      messages: [
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ]},
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
