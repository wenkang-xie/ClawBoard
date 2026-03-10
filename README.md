# Agent Dashboard

OpenClaw 多 Agent 管理端，可视化监控 Agent 运行状态、任务与记忆。

## 功能

- **Dashboard**：实时监控 Gateway 状态、Token 消耗趋势、模型/Agent 分布
- **Sessions**：Session 列表与详情页，支持 relations/runs 关联查看
- **Memory**：多 Agent 记忆索引与预览（main/architect/research/designer）
- **Tasks**：任务看板 + 自动轮询 + 新建任务入口
- **Agents**：Agent 配置与状态
- **Settings**：系统配置

## 技术栈

- Vite + React 18 + TypeScript
- TailwindCSS
- BFF 层（Node.js）

## 快速启动

### 开发模式

```bash
# 终端1：BFF（必须）
npm run bff

# 终端2：前端
npm run dev
```

- 前端：http://127.0.0.1:5173
- BFF：http://127.0.0.1:18902

### 生产构建

```bash
npm run build

# 预览
npm run preview
```

构建产物在 `dist/`，可部署到任意静态托管（Vercel/Netlify/nginx）。

### BFF 进程管理

生产环境建议用 pm2 或 systemd 管理 BFF 进程：

```bash
pm2 start "npm run bff" --name agent-dashboard-bff
```

## 目录结构

```
├── src/
│   ├── components/     # React 组件
│   ├── pages/         # 页面
│   ├── hooks/         # 自定义 Hooks
│   ├── lib/           # 工具函数
│   └── App.tsx        # 路由
├── server/
│   └── index.js       # BFF 服务
├── docs/              # 设计文档
└── public/            # 静态资源
```

## API

BFF 提供以下接口：

| Method | Endpoint | 说明 |
|--------|----------|------|
| GET | `/api/tasks` | 获取任务列表 |
| POST | `/api/tasks` | 创建新任务 |
| GET | `/api/runs` | 获取 Subagent 运行记录 |
| GET | `/api/sessions` | 获取 Session 列表 |
| GET | `/api/sessions/:key/detail` | Session 详情 |
| GET | `/api/sessions/:key/relations` | Session 关联 |
| GET | `/api/sessions/:key/events` | Session 事件 |
| GET | `/api/v1/memory/agents` | 可用 Agent 列表 |
| GET | `/api/v1/memory/list?agentId=<id>` | Memory 文件列表 |
| GET | `/api/v1/memory/preview?agentId=<id>&path=<p>` | 文件预览 |

## 版本

v0.1.0
