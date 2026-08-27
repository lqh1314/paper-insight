import { Module } from '@nestjs/common';
import { PaperQaController } from './paper-qa.controller';
import { PaperQaService } from './paper-qa.service';

@Module({ controllers: [PaperQaController], providers: [PaperQaService] })
export class PaperQaModule {}
