import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { PapersModule } from './modules/papers/papers.module';
import { PaperPptModule } from './modules/paper-ppt/paper-ppt.module';
import { PaperQaModule } from './modules/paper-qa/paper-qa.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    PlatformModule.forRoot(),
    PapersModule,
    PaperPptModule,
    PaperQaModule,
    ViewModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
