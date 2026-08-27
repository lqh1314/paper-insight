# 论文智析 (Paper Insight)

> AI 驱动的学术论文智能解析与 PPT 生成平台

## 功能特性

- 📄 **论文上传**：支持单文件/文件夹上传，兼容 PDF、Word、图片、TXT、Markdown 格式
- 🤖 **AI 解析**：自动提取标题、作者、摘要、研究背景、核心方法、实验结果、结论、创新点、关键词
- 🖼️ **图表提取**：自动提取 PDF 中的图片/图表，按章节关联，AI 生成图片描述
- 📊 **PPT 生成**：AI 自动生成结构化幻灯片，支持在线翻页预览、全屏播放和 **.pptx 文件下载**
- 💬 **AI 问答**：单篇论文智能问答 + 多篇论文跨论文对比问答
- 💾 **历史记录**：论文、解析结果、PPT、问答记录全部持久化保存

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：NestJS + Drizzle ORM + PostgreSQL
- **AI 能力**：文档解析、结构化提取、图片理解、文本生成（妙搭平台插件）
- **PPT 导出**：PptxGenJS（浏览器端生成真实 .pptx 文件）
- **PDF 处理**：pdf.js（前端提取内嵌图片）

## 项目结构

```
├── client/                    # 前端源码
│   ├── index.html
│   └── src/
│       ├── api/               # API 请求层
│       ├── components/        # 公共组件
│       ├── pages/             # 页面
│       │   ├── HomePage/      # 工作台（上传+历史列表）
│       │   ├── PaperDetailPage/ # 论文详情（要点+PPT+问答）
│       │   ├── ComparePage/   # 论文对比+跨论文问答
│       │   └── PptFullscreenPage/ # PPT全屏播放
│       └── utils/             # 工具函数（PPT生成、PDF图片提取）
├── server/                    # 后端源码
│   ├── main.ts
│   ├── app.module.ts
│   ├── database/schema.ts     # 数据库表结构
│   └── modules/
│       ├── papers/            # 论文管理与AI解析
│       ├── paper-ppt/         # PPT生成
│       └── paper-qa/          # AI问答
└── shared/
    └── api.interface.ts       # 前后端共享类型定义
```

## 快速开始

本项目基于飞书妙搭全栈应用模板，需在妙搭平台中运行。

```bash
npm install
npm run dev
```

## 页面说明

| 页面 | 路由 | 功能 |
|------|------|------|
| 工作台 | `/` | 上传论文、查看历史论文列表、搜索、选择对比 |
| 论文详情 | `/paper/:id` | 三栏布局：要点摘要 + PPT预览 + AI问答 |
| 论文对比 | `/compare` | 多篇论文并排对比 + 跨论文问答 |
| PPT全屏 | `/ppt/:paperId/fullscreen` | 幻灯片全屏播放（键盘翻页、自动播放） |

## License

MIT
