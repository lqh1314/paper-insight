import { Controller, Get, Render, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller()
export class ViewController {
  @Get(['/', '*'])
  @Render('index')
  async render(@Req() req: Request): Promise<{ __platform__: string }> {
    const platformData = (req as any).__platform_data__ ?? {};
    return { __platform__: JSON.stringify(platformData) };
  }
}
