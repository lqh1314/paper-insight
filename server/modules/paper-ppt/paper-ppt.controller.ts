import { Controller, Post, Get, Body, Param, NotFoundException } from '@nestjs/common';
import { PaperPptService } from './paper-ppt.service';
import type { GeneratePptRequest, ApiResponse, PaperPptInfo, PaperSlide } from '@shared/api.interface';

@Controller('api/paper-ppt')
export class PaperPptController {
  constructor(private readonly paperPptService: PaperPptService) {}

  @Post('generate')
  async generate(@Body() body: GeneratePptRequest): Promise<ApiResponse<{ id: string }>> {
    const id = await this.paperPptService.generate(body.paperId);
    return { success: true, data: { id }, message: '生成中' };
  }

  @Get(':paperId')
  async getPpt(@Param('paperId') paperId: string): Promise<ApiResponse<PaperPptInfo | null>> {
    const ppt = await this.paperPptService.getPptByPaperId(paperId);
    return { success: true, data: ppt, message: 'ok' };
  }

  @Get(':paperId/download')
  async downloadPpt(@Param('paperId') paperId: string): Promise<ApiResponse<{ slides: PaperSlide[] }>> {
    const ppt = await this.paperPptService.getPptByPaperId(paperId);
    if (!ppt) throw new NotFoundException('PPT不存在，请先生成');
    return { success: true, data: { slides: ppt.slides }, message: 'ok' };
  }
}
