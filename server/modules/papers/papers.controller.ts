import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PapersService } from './papers.service';
import type { UploadPaperRequest, PaperListResult, PaperDetail, ApiResponse, SavePaperImagesRequest } from '@shared/api.interface';

@Controller('api/papers')
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Post('upload')
  async upload(@Req() req: Request, @Body() dto: UploadPaperRequest): Promise<ApiResponse<{ id: string }>> {
    const userId = (req as any).userContext?.userId || 'anonymous';
    const id = await this.papersService.create(dto, userId);
    return { success: true, data: { id }, message: 'ok' };
  }

  @Post(':id/parse')
  @HttpCode(HttpStatus.ACCEPTED)
  async parse(@Req() req: Request, @Param('id') id: string): Promise<ApiResponse<null>> {
    const userId = (req as any).userContext?.userId || 'anonymous';
    await this.papersService.startParse(id, userId);
    return { success: true, data: null, message: '解析任务已启动' };
  }

  @Get()
  async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('keyword') keyword?: string): Promise<ApiResponse<PaperListResult>> {
    const data = await this.papersService.list(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
      keyword,
    );
    return { success: true, data, message: 'ok' };
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ApiResponse<PaperDetail>> {
    const data = await this.papersService.getDetail(id);
    return { success: true, data, message: 'ok' };
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string): Promise<ApiResponse<null>> {
    const userId = (req as any).userContext?.userId || 'anonymous';
    await this.papersService.remove(id, userId);
    return { success: true, data: null, message: 'ok' };
  }

  @Post(':id/images')
  async saveImages(@Req() req: Request, @Param('id') id: string, @Body() dto: SavePaperImagesRequest): Promise<ApiResponse<null>> {
    const userId = (req as any).userContext?.userId || 'anonymous';
    await this.papersService.saveImages(id, dto.images, userId);
    return { success: true, data: null, message: 'ok' };
  }

  @Post(':id/image-understanding')
  @HttpCode(HttpStatus.ACCEPTED)
  async startImageUnderstanding(@Req() req: Request, @Param('id') id: string): Promise<ApiResponse<null>> {
    const userId = (req as any).userContext?.userId || 'anonymous';
    await this.papersService.startImageUnderstanding(id, userId);
    return { success: true, data: null, message: '图片理解任务已启动' };
  }

  @Get(':id/file-proxy')
  async getFileProxy(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const buffer = await this.papersService.getFileBuffer(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }
}
