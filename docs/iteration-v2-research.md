# Agent 看板迭代 V2 功能优先级调研报告

> 调研日期：2026-03-08
> 调研者：Umi（Research Agent）
> 背景：基于 V2 PRD 已完成，下一步迭代方向明确为「多 Gateway 支持」「配置中心」「诊断/日志/重启操作台」

---

## 结论摘要

基于 DevOps 控制台（K8s Dashboard、Lens、Portainer）、观测平台（Datadog、Grafana）、Serverless 面板（Vercel、Railway）的功能范式，提炼出 12 项可落地能力。**P0 优先级 3 项**：Gateway 列表管理与健康聚合（价值最高，复杂度低）、openclaw.json 可视化编辑（核心配置中心，复杂度中）、统一日志查看器（诊断基础，复杂度低）。**P1 优先级 4 项**：Gateway 专属页面、配置版本历史与回滚、Agent 进程重启、日志筛选与导出。**P2 优先级 5 项**：配置 diff 预览、告警规则、多 Gateway 资源拓扑图、配置模板市场、Webhook 通知。下一版应聚焦 P0 能力快速交付，P1 分步迭代。

---

## 一、竞品启发

### 1.1 多 Gateway / 多集群管理类

| 产品 | 核心能力 | 启发点 |
|------|---------|--------|
| **Kubernetes Dashboard / Lens** | 多集群上下文切换、集群概览卡片、命名空间过滤 | Gateway 选择器 + 状态卡片；按 Gateway 过滤数据 |
| **Argo CD** | 多集群统一视图、集群健康状态聚合、应用分发状态 | 跨 Gateway 任务流转图（聚合视角） |
| **Portainer** | 多环境（Docker/ Swarm/ Kubernetes）接入、模板化配置 | Gateway 配置模板导入/导出 |
| **Rancher** | 集群发现、角色权限、主机监控 | 局域网 Gateway 自动发现 |

**关键启发**：多实例管理的核心模式是「聚合概览 + 上下文切换 + 独立详情」。先做统一视图让用户一眼全局，再提供下钻能力。

### 1.2 配置中心类

| 产品 | 核心能力 | 启发点 |
|------|---------|--------|
| **Vercel Dashboard** | 环境变量可视化编辑、Secret 加密显示、团队配置 | openclaw.json 分类展示（Gateway/Agents/Channels） |
| **Railway** | 配置变更 diff、One-click 回滚、模板市场 | 配置版本历史 + 一键回滚 |
| **Terraform Cloud** | Plan 预览、Apply 确认、State 版本管理 | 配置变更预览（diff）+ 确认机制 |

**关键启发**：配置中心的核心价值是「可视化 + 安全 + 可回滚」。不做简单的文件编辑器，而是带语义的分类编辑 + 版本控制。

### 1.3 诊断 / 日志 / 运维操作台类

| 产品 | 核心能力 | 启发点 |
|------|---------|--------|
| **Datadog / Grafana** | 日志聚合搜索、实时流、指标仪表盘、告警 | 日志查看器 + 关键词筛选 + 级别过滤 |
| **Kubernetes Dashboard** | Pod 日志滚动、容器重启、事件流 | Agent 进程重启操作 + 健康状态指示 |
| **Railway / Render** | 一键重启、日志流、部署历史 | Restart 按钮 + 日志面板 + 操作确认 |

**关键启发**：诊断操作台的三件套是「日志 + 指标 + 操作」。日志是排查第一步，重启是终极兜底手段。

---

## 二、功能池

以下功能按能力域分组，每项标注**价值等级**（高/中/低）和**实现复杂度**（高/中/低）。

### 2.1 多 Gateway 支持

| # | 功能 | 价值 | 复杂度 | 说明 |
|---|------|------|--------|------|
| F1 | Gateway 列表管理（添加/删除/编辑） | 高 | 低 | 在 Settings 页维护 Gateway URL + Token 列表，存 localStorage |
| F2 | Gateway 健康状态聚合 | 高 | 低 | 对列表中每个 Gateway 调用 `health`，聚合展示在线/离线/Agent 数 |
| F3 | Gateway 上下文切换 | 高 | 低 | 顶部下拉菜单切换当前 Gateway，触发 WS 重连 + 数据刷新 |
| F4 | Gateway 自动发现（局域网） | 中 | 高 | 调用 `openclaw gateway discover`（Bonjour），自动填充列表 |
| F5 | Gateway 专属详情页 | 中 | 低 | 切换 Gateway 后，各页面数据自动带上该 Gateway 上下文 |
| F6 | 跨 Gateway 任务流转图 | 低 | 高 | 聚合多个 Gateway 的 subagent 派发记录，画统一时间轴（暂不做） |

### 2.2 openclaw.json 配置中心

| # | 功能 | 价值 | 复杂度 | 说明 |
|---|------|------|--------|------|
| F7 | 配置分类展示 | 高 | 低 | 按 sections（gateway/agents/channels）分组展示，而非原始 JSON 堆砌 |
| F8 | 可视化编辑（表单） | 高 | 中 | 每个 section 对应一个表单：Gateway 端口/模式、Agent 列表增删改、Channel 配置 |
| F9 | 配置校验与错误提示 | 高 | 中 | 保存前校验 JSON 合法性、字段类型、必要项，空值/格式错误给出提示 |
| F10 | 配置版本历史 | 中 | 中 | 每次保存记录快照（存 localStorage 或文件），支持查看历史 + 回滚 |
| F11 | 配置 diff 预览 | 中 | 中 | 编辑后显示变更diff（新增/删除/修改行），确认后再保存 |
| F12 | 配置导入/导出 | 低 | 低 | 导出为 .json 文件分享，导入覆盖当前配置 |

### 2.3 诊断 / 日志 / 重启操作台

| # | 功能 | 价值 | 复杂度 | 说明 |
|---|------|------|--------|------|
| F13 | 统一日志查看器 | 高 | 低 | 调用 Gateway `logs.tail` 或 `logs.query`，按 Gateway 聚合展示 |
| F14 | 日志级别过滤 | 高 | 低 | 支持 error/warn/info/debug 筛选项 |
| F15 | 日志关键词搜索 | 中 | 低 | 文本输入框实时过滤 |
| F16 | 日志导出 | 中 | 低 | 下载为 .log 或 .txt 文件 |
| F17 | Agent 进程状态指示 | 高 | 低 | 从 `health` 读取每个 Agent 的 sessions.count + 最后活跃时间 |
| F18 | Agent 重启操作 | 高 | 中 | 提供 Restart 按钮，调用 `openclaw agents restart <agentId>` 或对应 RPC |
| F19 | Gateway 重启操作 | 中 | 中 | Restart Gateway 进程（需要 exec 权限调用系统命令） |
| F20 | 实时健康指标卡片 | 中 | 低 | 复用 V2 PRD 中的 Dashboard 卡片，扩展显示 CPU/内存（如可获取） |

---

## 三、优先级建议

### P0 — 下一版必须做（MVP 扩展）

| 功能 | 对应编号 | 价值 | 复杂度 | 理由 |
|------|----------|------|--------|------|
| Gateway 列表管理 | F1 | 高 | 低 | 多 Gateway 基础数据层，必须先有 |
| Gateway 健康状态聚合 | F2 | 高 | 低 | 多 Gateway 核心价值点，一眼全局 |
| Gateway 上下文切换 | F3 | 高 | 低 | 切换体验核心操作，低成本高回报 |
| 配置分类展示 | F7 | 高 | 低 | 配置中心入口，用户能看到结构 |
| 可视化编辑（表单） | F8 | 高 | 中 | 配置中心核心功能，需处理多类型字段 |
| 配置校验与错误提示 | F9 | 高 | 中 | 防止误配置导致 Gateway 故障 |
| 统一日志查看器 | F13 | 高 | 低 | 诊断基础，V2 PRD 已规划 Logs 页但未细化 |
| 日志级别过滤 | F14 | 高 | 低 | 快速定位问题，交互简单 |
| Agent 进程状态指示 | F17 | 高 | 低 | 运维视角必备 |

**P0 小计**：9 项，复杂度以低为主，2 项中复杂度。**预期工作量**：3-4 天。

---

### P1 — 下下版迭代（增强能力）

| 功能 | 对应编号 | 价值 | 复杂度 | 理由 |
|------|----------|------|--------|------|
| Gateway 专属详情页 | F5 | 中 | 低 | 切换后自然延伸 |
| Gateway 自动发现 | F4 | 中 | 高 | 局域网场景加分项，但实现有网络依赖 |
| 配置版本历史 | F10 | 中 | 中 | 配置安全垫，需要存储快照 |
| 配置 diff 预览 | F11 | 中 | 中 | 编辑体验优化 |
| 日志关键词搜索 | F15 | 中 | 低 | 日志查看器自然扩展 |
| Agent 重启操作 | F18 | 高 | 中 | 运维兜底手段，需求明确 |
| 日志导出 | F16 | 中 | 低 | 辅助功能 |

**P1 小计**：7 项，复杂度分布均匀。**预期工作量**：3-4 天。

---

### P2 — 后续规划（锦上添花）

| 功能 | 对应编号 | 价值 | 复杂度 | 理由 |
|------|----------|------|--------|------|
| 配置导入/导出 | F12 | 低 | 低 | 非刚需 |
| Gateway 重启操作 | F19 | 中 | 中 | 破坏性操作，需谨慎 |
| 实时健康指标卡片 | F20 | 中 | 低 | 指标数据获取依赖系统 API |
| 跨 Gateway 任务流转图 | F6 | 低 | 高 | 过于复杂，收益不明确 |
| 告警规则 | — | 中 | 高 | 需额外通知渠道 |
| 配置模板市场 | — | 低 | 高 | 暂无可用模板源 |
| Webhook 通知 | — | 中 | 高 | 需对接外部服务 |

**P2 小计**：7 项，优先级低，可视资源情况择机迭代。

---

## 四、风险与前置条件

### 4.1 技术风险

| 风险点 | 影响 | 缓解措施 |
|--------|------|----------|
| 多 Gateway WS 连接管理 | 多个 Gateway 同时维护 WS 连接，前端状态复杂度上升 | 使用 TanStack Query 的 `queryClient` 按 Gateway ID 隔离缓存；或使用 Context 传递当前 Gateway |
| 配置保存后 Gateway 热加载 | 修改 openclaw.json 后 Gateway 是否自动 reload | 调用 `openclaw gateway restart` 或提供 Reload 按钮；先在本地测试验证 |
| `logs.tail` API 稳定性 | 日志流接口可能无输出或格式不稳定 | 先用 `sessions.list` + `sessions.preview` 做兜底日志源；确认 Gateway 日志 API 可用 |
| Agent 重启 RPC 权限 | `agents.restart` 方法是否在 WRITE scope | 通过 `openclaw gateway call agents.list` 验证权限；若无 restart 方法，改用 CLI exec |

### 4.2 产品设计前置

| 前置条件 | 说明 |
|----------|------|
| V2 PRD 基础页面已实现 | Dashboard / Agents / Sessions / Tasks / Settings 基础框架需先搭好（V2 PRD 原定 5 天） |
| Gateway URL + Token 管理 UI | P0 的 Gateway 列表管理即为此前置 |
| 明确"当前 Gateway"上下文 | 所有数据请求需带上 Gateway 标识（URL + Token），避免串数据 |

### 4.3 用户侧预期管理

| 预期 | Reality |
|------|---------|
| 配置修改即时生效 | 部分配置（Agent 列表）需要 Gateway 重启才能生效，需提示用户 |
| 日志实时推送 | 若 Gateway 无 push 能力，先做 5-10s 轮询；后续可升级为 SSE |
| 多 Gateway 自动发现 | 局域网发现依赖 Bonjour，可能有时延或发现不全，先做手动添加 |

---

## 五、下一版行动建议

### 直接开干（P0）

1. **Gateway 管理 UI**：在 Settings 页增加 Gateway 列表（URL + Token + 备注名），支持增删改，存 localStorage
2. **健康聚合 Dashboard**：遍历 Gateway 列表，调用各 `health`，展示卡片矩阵（在线/离线/Agent 数）
3. **配置中心表单**：将 openclaw.json 拆为 Gateway / Agents / Channels 三个 Tab，各对应一个表单
4. **日志查看器**：复用 V2 Sessions 页的 Logs 区域，改为独立 Logs 入口，支持级别过滤

### 后续迭代（P1）

5. Agent Restart 按钮 + 确认对话框
6. 配置版本历史（快照存 localStorage）
7. 日志关键词搜索 + 导出

---

## 六、参考来源

- Kubernetes Dashboard / Lens：多集群管理范式
- Portainer：多环境接入 + 模板化
- Vercel Dashboard：环境变量 + Secret 管理
- Railway：配置 diff + 一键回滚
- Datadog / Grafana：日志聚合 + 筛选
- OpenClaw Gateway WebSocket RPC API（来自 V2 调研报告）
- V2 PRD 原定功能范围

---

## 不确定项（需确认）

1. **Gateway 日志 API**：需确认 `logs.tail` / `logs.query` 方法是否稳定返回数据？若无，是否用 `sessions.preview` 兜底？
2. **Agent 重启权限**：`agents.restart` 方法是否在 WRITE scope？若无，是否改用 `openclaw agents restart` CLI？
3. **配置热加载**：修改 openclaw.json 后 Gateway 是否自动 reload？还是需要手动调用 restart？
