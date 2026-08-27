# 论文智析 (Paper Insight)

> AI 驱动的学术论文智能解析与 PPT 生成平台 —— 全平台可用，无厂商锁定

## 功能特性

- 📄 **论文上传**：支持单文件/文件夹拖拽上传，兼容 PDF、Word、图片（OCR）、TXT、Markdown
- 🤖 **AI 解析**：自动提取标题、作者、摘要、研究背景、核心方法、实验结果、结论、创新点、关键词
- 🖼️ **图表提取**：自动提取 PDF 内嵌图片/图表，按章节关联，AI 视觉模型生成图片描述
- 📊 **PPT 生成**：AI 自动生成结构化幻灯片，支持在线翻页预览、全屏播放和 **.pptx 文件下载**
- 💬 **AI 问答**：单篇论文智能问答 + 多篇论文跨论文对比问答，对话历史持久化
- 💾 **历史记录**：论文、解析结果、PPT、问答记录全部保存到 PostgreSQL

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | NestJS 10 + Drizzle ORM |
| 数据库 | PostgreSQL |
| AI | OpenAI 兼容接口（支持 OpenAI / DeepSeek / 通义千问 / 智谱 / Ollama 等） |
| 文档解析 | pdf-parse / pdfjs-dist（PDF）、mammoth（Word）、AI Vision（图片 OCR） |
| PPT 导出 | PptxGenJS（浏览器端生成真实 .pptx） |

## 快速开始

### 1. 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- 一个 OpenAI 兼容的 API Key

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# PostgreSQL 连接字符串
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paper_insight

# AI 模型（OpenAI 兼容接口，以下以 DeepSeek 为例）
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=sk-your-key
AI_MODEL=deepseek-chat
AI_VISION_MODEL=deepseek-chat

# 文件存储
UPLOAD_DIR=./uploads
FILE_BASE_URL=http://localhost:3000/uploads
```

> **AI 服务商配置示例**
> - OpenAI：`AI_BASE_URL=https://api.openai.com/v1`，`AI_MODEL=gpt-4o-mini`
> - DeepSeek：`AI_BASE_URL=https://api.deepseek.com/v1`，`AI_MODEL=deepseek-chat`
> - 通义千问：`AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`，`AI_MODEL=qwen-plus`
> - 智谱：`AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4`，`AI_MODEL=glm-4-flash`
> - Ollama（本地）：`AI_BASE_URL=http://localhost:11434/v1`，`AI_MODEL=llama3`，`AI_API_KEY=ollama`

### 4. 初始化数据库

```bash
# 创建数据库
createdb paper_insight

# 执行建表脚本
psql -U postgres -d paper_insight -f schema.sql
```

### 5. 启动开发服务器

```bash
# 同时启动前端（5173）和后端（3000）
npm run dev
```

访问 http://localhost:5173

### 6. 生产构建

```bash
npm run build
npm start
```

## 项目结构

```
├── client/                        # 前端源码
│   ├── index.html
│   └── src/
│       ├── api/                   # API 请求层
│       ├── components/            # 公共组件（Layout）
│       ├── pages/
│       │   ├── HomePage/          # 工作台（上传+历史列表）
│       │   ├── PaperDetailPage/   # 论文详情（要点+PPT+问答）
│       │   ├── ComparePage/       # 论文对比+跨论文问答
│       │   ├── PptFullscreenPage/ # PPT全屏播放
│       │   └── NotFound/
│       └── utils/
│           ├── pptx-generator.ts  # PptxGenJS 生成 .pptx
│           └── pdf-image-extractor.ts # pdf.js 提取PDF图片
├── server/                        # 后端源码
│   ├── main.ts                    # 入口
│   ├── app.module.ts
│   ├── database/
│   │   ├── database.module.ts     # Drizzle 连接
│   │   └── schema.ts              # 表结构定义
│   ├── common/
│   │   ├── filters/               # 全局异常过滤器
│   │   └── services/
│   │       ├── ai.service.ts          # OpenAI 兼容 AI 服务
│   │       ├── document-parser.service.ts # PDF/Word/图片解析
│   │       └── file.service.ts        # 本地文件存储
│   └── modules/
│       ├── papers/                # 论文上传/解析/图片
│       ├── paper-ppt/             # PPT 生成
│       ├── paper-qa/              # AI 问答
│       └── view/                  # 前端页面服务
├── shared/
│   └── api.interface.ts           # 前后端共享类型
├── schema.sql                     # 数据库建表脚本
├── .env.example                   # 环境变量模板
└── package.json
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/papers/upload` | 上传论文文件（multipart/form-data） |
| POST | `/api/papers/:id/parse` | 重新触发解析 |
| GET | `/api/papers` | 论文列表（分页+搜索） |
| GET | `/api/papers/:id` | 论文详情（含解析+PPT） |
| DELETE | `/api/papers/:id` | 删除论文 |
| POST | `/api/papers/:id/images` | 保存提取的图片 |
| POST | `/api/papers/:id/image-understanding` | 触发 AI 图片理解 |
| GET | `/api/papers/:id/file-proxy` | 文件代理（避免CORS） |
| POST | `/api/paper-ppt/generate` | 生成 PPT |
| GET | `/api/paper-ppt/:paperId` | 获取 PPT 信息 |
| POST | `/api/paper-qa/ask` | 提问（支持单篇/多篇） |
| GET | `/api/paper-qa/history` | 问答历史 |

## 部署

### Docker（可选）

```dockerfile
# 多阶段构建示例
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/schema.sql ./
EXPOSE 3000
CMD ["node", "dist/server/main.js"]
```

## License

MIT
