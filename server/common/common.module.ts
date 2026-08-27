import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { DocumentParserService } from './document-parser.service';
import { FileService } from './file.service';

@Global()
@Module({
  providers: [AiService, DocumentParserService, FileService],
  exports: [AiService, DocumentParserService, FileService],
})
export class CommonModule {}
