-- 论文智析数据库初始化脚本
-- 在 PostgreSQL 中执行：psql -U postgres -d paper_insight -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 论文表
CREATE TABLE IF NOT EXISTS paper (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  parse_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  full_text TEXT,
  source_type VARCHAR(30) NOT NULL DEFAULT 'single',
  batch_id UUID,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paper_created_at ON paper(_created_at);
CREATE INDEX IF NOT EXISTS idx_paper_status ON paper(parse_status);

-- 论文解析结果表
CREATE TABLE IF NOT EXISTS paper_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID NOT NULL UNIQUE REFERENCES paper(id) ON DELETE CASCADE,
  authors TEXT,
  abstract TEXT,
  research_background TEXT,
  core_method TEXT,
  experiment_result TEXT,
  conclusion TEXT,
  innovation_contribution TEXT,
  keywords VARCHAR(500),
  images JSONB DEFAULT '{}',
  image_understanding_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PPT表
CREATE TABLE IF NOT EXISTS paper_ppt (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID NOT NULL UNIQUE REFERENCES paper(id) ON DELETE CASCADE,
  slides JSONB NOT NULL DEFAULT '[]',
  ppt_file_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 问答记录表
CREATE TABLE IF NOT EXISTS paper_qa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_ids UUID[] NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paper_qa_created_at ON paper_qa(_created_at);
