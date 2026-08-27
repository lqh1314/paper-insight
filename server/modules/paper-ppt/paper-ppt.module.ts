import { Module } from '@nestjs/common';
import { PaperPptController } from './paper-ppt.controller';
import { PaperPptService } from './paper-ppt.service';

@Module({ controllers: [PaperPptController], providers: [PaperPptService] })
export class PaperPptModule {}
