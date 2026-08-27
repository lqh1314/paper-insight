import { sql } from 'drizzle-orm';
import { bigint, foreignKey, index, jsonb, pgTable, text, uniqueIndex, uuid, varchar, customType } from 'drizzle-orm/pg-core';

export const customTimestamptz = customType<{ data: Date; driverData: string }>({
  dataType: () => 'timestamptz',
  toDriver(value: Date | string) { return typeof value === 'string' ? value : value.toISOString(); },
  fromDriver(value: string | Date) { return value instanceof Date ? value : new Date(value); },
});

export const paper = pgTable('paper', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: varchar('file_type', { length: 50 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  parseStatus: varchar('parse_status', { length: 30 }).notNull().default('pending'),
  fullText: text('full_text'),
  sourceType: varchar('source_type', { length: 30 }).notNull().default('single'),
  batchId: uuid('batch_id'),
  createdAt: customTimestamptz('_created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz('_updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_paper_created_at').on(table.createdAt),
  index('idx_paper_status').on(table.parseStatus),
]);

export const paperAnalysis = pgTable('paper_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id').notNull().unique(),
  authors: text('authors'),
  abstract: text('abstract'),
  researchBackground: text('research_background'),
  coreMethod: text('core_method'),
  experimentResult: text('experiment_result'),
  conclusion: text('conclusion'),
  innovationContribution: text('innovation_contribution'),
  keywords: varchar('keywords', { length: 500 }),
  images: jsonb('images').default('{}'),
  imageUnderstandingStatus: varchar('image_understanding_status', { length: 30 }).notNull().default('pending'),
  createdAt: customTimestamptz('_created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz('_updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('idx_paper_analysis_paper_id').on(table.paperId),
  foreignKey({ columns: [table.paperId], foreignColumns: [paper.id], name: 'paper_analysis_paper_id_fkey' }).onDelete('cascade'),
]);

export const paperPpt = pgTable('paper_ppt', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id').notNull().unique(),
  slides: jsonb('slides').notNull().default('[]'),
  pptFileUrl: text('ppt_file_url'),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  createdAt: customTimestamptz('_created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz('_updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('idx_paper_ppt_paper_id').on(table.paperId),
  foreignKey({ columns: [table.paperId], foreignColumns: [paper.id], name: 'paper_ppt_paper_id_fkey' }).onDelete('cascade'),
]);

export const paperQa = pgTable('paper_qa', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperIds: uuid('paper_ids').array().notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  createdAt: customTimestamptz('_created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_paper_qa_created_at').on(table.createdAt),
]);
