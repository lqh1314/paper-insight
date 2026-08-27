import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PaperQaService } from './paper-qa.service';
import type { AskQuestionRequest, QaListParams, QaRecord, ApiResponse } from '@shared/api.interface';

@Controller('api/paper-qa')
export class PaperQaController {
  constructor(private readonly paperQaService: PaperQaService) {}

  @Post('ask')
  async ask(@Body() body: AskQuestionRequest): Promise<ApiResponse<QaRecord>> {
    const data = await this.paperQaService.askQuestion(body);
    return { success: true, data, message: 'ok' };
  }

  @Get('history')
  async getHistory(
    @Query('paperId') paperId?: string,
    @Query('paperIds') paperIds?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<QaRecord[]>> {
    const params: QaListParams = {
      paperId,
      paperIds: paperIds ? paperIds.split(',').filter(Boolean) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    const data = await this.paperQaService.getHistory(params);
    return { success: true, data, message: 'ok' };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ApiResponse<QaRecord>> {
    const data = await this.paperQaService.getById(id);
    return { success: true, data, message: 'ok' };
  }
}
