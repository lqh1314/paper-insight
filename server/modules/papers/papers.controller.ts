import {
  Controller, Post, Get, Delete, Body, Param, Query, Res, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PapersService } from './papers.service';
import type {
  PaperListResult, PaperDetail, ApiResponse, SavePaperImagesRequest,
} from '@shared/api.interface';

@Controller('api/papers')
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  /**
   * 上传论文文件（multipart/form-data）
   * 同时支持单文件和文件夹中的多个文件（前端逐文件调用）
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('sourceType') sourceType?: string,
    @Body('batchId') batchId?: string,
  ): Promise<ApiResponse<{ id: string }>> {
    if (!file) {
      return { success: false, data: null as any, message: '请上传文件' };
    }
    const id = await this.papersService.createFromUpload(file, sourceType as any, batchId);
    return { success: true, data: { id }, message: '上传成功，解析已启动' };
  }

  @Post(':id/parse')
  @HttpCode(HttpStatus.ACCEPTED)
  async parse(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.papersService.startParse(id);
    return { success: true, data: null, message: '解析任务已启动' };
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ): Promise<ApiResponse<PaperListResult>> {
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
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.papersService.remove(id);
    return { success: true, data: null, message: 'ok' };
  }

  @Post(':id/images')
  async saveImages(
    @Param('id') id: string,
    @Body() dto: SavePaperImagesRequest,
  ): Promise<ApiResponse<null>> {
    await this.papersService.saveImages(id, dto.images);
    return { success: true, data: null, message: 'ok' };
  }

  @Post(':id/image-understanding')
  @HttpCode(HttpStatus.ACCEPTED)
  async startImageUnderstanding(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.papersService.startImageUnderstanding(id);
    return { success: true, data: null, message: '图片理解任务已启动' };
  }

  @Get(':id/file-proxy')
  async getFileProxy(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer, mimeType } = await this.papersService.getFileBuffer(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }
}
