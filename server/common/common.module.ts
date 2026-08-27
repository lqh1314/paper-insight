import { Injectable } from '@nestjs/common';
import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { DocumentParserService } from './document-parser.service';

@Global()
@Module({
  providers: [AiService, DocumentParserService],
  exports: [AiService, DocumentParserService],
})
export class CommonModule {}
