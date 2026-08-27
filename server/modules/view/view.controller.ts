import { Controller, Get, Res } from '@nestjs/common';
import { join } from 'path';
import type { Response } from 'express';

@Controller()
export class ViewController {
  @Get(['/', '/paper/:id', '/compare', '/ppt/:paperId/fullscreen'])
  async render(@Res() res: Response): Promise<void> {
    res.sendFile(join(process.cwd(), 'dist/client/index.html'));
  }
}
