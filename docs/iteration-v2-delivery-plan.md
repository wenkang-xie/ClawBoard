# Agent 看板 v2 可执行迭代计划（Delivery Plan）

> 版本：v2-delivery-1.0  
> 日期：2026-03-08  
> 输入基线：
> - `iteration-v2-research.md`
> - `iteration-v2-ux.md`
> - `iteration-v2-architecture.md`

---

## 0. 目标与执行原则

### 0.1 目标
在不引入过度架构的前提下，将 Agent 看板 v2 拆分为 **M1/M2/M3 三个可上线里程碑**，保证：
1. 多 Gateway 可观测与可切换；
2. 配置中心“默认只读 + 双确认写入”；
3. 诊断/日志/重启形成运维闭环并具备审计可追溯性。

### 0.2 全局硬约束（贯穿 M1/M2/M3）
1. **配置中心默认只读**：任何写入/重启/回滚动作都必须触发二次确认流程。  
2. **多环境防误操作**：所有页面与 API 强制携带环境上下文（`prod/staging/dev`），并提供环境显著标识。  
3. **Prod 保护**：Prod 下高风险操作（apply/restart/rollback）必须输入确认文本（如 `APPLY <gateway-alias>`）。  
4. **能力兜底**：Gateway capability 不支持的动作在 UI 禁用，后端返回 `CAPABILITY_UNSUPPORTED`。

### 0.3 里程碑排期（建议）
- **M1：4 天**（多 Gateway + 只读基线）
- **M2：5 天**（配置中心写路径 + 双确认 + 回滚）
- **M3：4 天**（诊断/日志/重启 + 审计闭环）

总计：**13 天**（不含灰度观察期）

---

## M1：多 Gateway 可观测与上下文基线（预计 4 天）

### 1) 目标与范围
- 建立 Gateway 注册、状态聚合、上下文切换能力。
- 在 UI 层完成环境防误操作基础设施（环境标签、颜色、上下文固定展示）。
- 配置中心仅提供只读入口，不开放写入。

### 2) 任务清单

#### 后端
- M1-BE-01：实现 `gateway_registry`（基础字段 + env + capabilities + tags）。
- M1-BE-02：实现状态采集任务（30s 轮询 health），落库 `gateway_status_snapshot`。
- M1-BE-03：实现 Gateway 列表/详情/状态 API（只读）。
- M1-BE-04：实现 env-scope 参数校验中间件（请求必须显式 env）。
- M1-BE-05：错误码标准化（`AUTH_403`, `GATEWAY_UNREACHABLE`, `CAPABILITY_UNSUPPORTED`）。

#### 前端
- M1-FE-01：实现 `/fleet` 页面（环境过滤 + 卡片矩阵 + 在线/离线状态）。
- M1-FE-02：实现顶部 Gateway 上下文选择器（显示 Gateway + ENV + Region + 状态）。
- M1-FE-03：全局环境色编码（prod 红、staging 橙、dev 蓝/灰）。
- M1-FE-04：实现 Gateway 切换时缓存隔离（按 gatewayId + env 作为 query key）。
- M1-FE-05：配置中心页面骨架上线（只读 Banner：`ReadOnly Mode`）。

#### 联调
- M1-INT-01：完成 3 环境（dev/staging/prod）演示数据贯通。
- M1-INT-02：离线 Gateway 模拟，验证 30s 内状态变化可见。
- M1-INT-03：验证切换 Gateway 不串数据（会话、状态、配置视图隔离）。

### 3) API 合约冻结点
- `GET /api/v2/environments/{env}/gateways`
- `GET /api/v2/environments/{env}/gateways/{gatewayId}`
- `GET /api/v2/environments/{env}/gateways/{gatewayId}/status`

冻结内容：
- 请求参数：`env` 必填且枚举（prod/staging/dev）
- 返回最小字段：`id,name,env,capabilities,health,lastHeartbeatAt,latencyMs,agentCount,sessionCount`
- 错误码：`AUTH_403`,`GATEWAY_UNREACHABLE`

### 4) 验收标准（可测试）
1. 在 3 环境各配置 >=1 Gateway 时，Fleet 页面可正确分组展示。  
2. 任一 Gateway 下线后，状态在 **30s 内**从 healthy 变为 down。  
3. 切换 Gateway 后，页面数据源全部切换且无串读（通过 network trace 验证 gatewayId/env）。  
4. 配置中心写按钮不存在或不可点，明确显示只读模式。  
5. API Contract Test 全通过（字段/类型/错误码断言）。

### 5) 风险与回退策略
- 风险：部分 Gateway health 返回结构不统一。  
  - 缓解：Adapter 层做 normalize；异常进入 `degraded`。  
  - 回退：只展示基础在线/离线，不展示扩展指标。  
- 风险：切换频繁导致缓存污染。  
  - 缓解：query key 强绑定 env+gatewayId；切换时取消旧请求。  
  - 回退：短期强制切换后全量刷新。

### 6) 预计工期（天）
- 开发：3 天
- 联调与修复：1 天
- 合计：**4 天**

---

## M2：配置中心写路径（双确认 + 版本化 + 回滚）（预计 5 天）

### 1) 目标与范围
- 在“默认只读”前提下，开放可控写路径：草稿、Diff、双确认、Apply、版本回滚。
- 强化 Prod 防误操作：确认文本 + 风险摘要 + 必填变更说明。

### 2) 任务清单

#### 后端
- M2-BE-01：实现 `config_document`、`config_version`、`config_change_request` 表结构。
- M2-BE-02：实现 openclaw.json 脱敏读取与 schema 校验。
- M2-BE-03：实现 change-request 生命周期（draft -> pending_confirm -> confirmed -> applied/rejected）。
- M2-BE-04：实现 first/second confirm 接口（强制 second confirmer 不同身份或更高凭证）。
- M2-BE-05：实现 apply job + 执行前快照 + checksum 防篡改。
- M2-BE-06：实现 rollback 到指定 version（同样双确认）。

#### 前端
- M2-FE-01：配置中心模块树 + 表单/JSON 双视图。
- M2-FE-02：Diff 审阅页（Before/After + 字段级高亮 + 敏感字段警示）。
- M2-FE-03：双确认弹窗（确认环境、确认对象、输入 `APPLY <gateway-alias>`）。
- M2-FE-04：历史版本页（版本号、变更说明、操作者、时间、回滚入口）。
- M2-FE-05：Prod 模式下强提醒（红色风险条 + 必填 reason/ticket）。

#### 联调
- M2-INT-01：从配置编辑到 apply 全链路跑通，生成 operation job。
- M2-INT-02：验证双确认规则（同人二次确认应失败）。
- M2-INT-03：验证回滚后版本号与内容一致性。
- M2-INT-04：验证变更失败时自动保留回滚点。

### 3) API 合约冻结点
- `GET /api/v2/environments/{env}/gateways/{gatewayId}/config`
- `GET /api/v2/environments/{env}/gateways/{gatewayId}/config/versions`
- `POST /api/v2/environments/{env}/gateways/{gatewayId}/config/change-requests`
- `POST /api/v2/environments/{env}/change-requests/{requestId}/confirm-first`
- `POST /api/v2/environments/{env}/change-requests/{requestId}/confirm-second`
- `POST /api/v2/environments/{env}/change-requests/{requestId}/apply`
- `POST /api/v2/environments/{env}/gateways/{gatewayId}/config/rollback`

冻结内容：
- 变更状态机字段（`draft/pending_confirm/confirmed/applied/rejected/rolled_back`）
- 双确认约束字段（`first_confirm_by`,`second_confirm_by`,`expires_at`）
- 错误码：`CONFIRMATION_REQUIRED`,`ROLLBACK_FAILED`,`AUTH_403`

### 4) 验收标准（可测试）
1. 默认进入配置中心时不可直接写入；必须创建变更请求。  
2. 未完成二次确认时调用 apply，返回 `CONFIRMATION_REQUIRED`。  
3. second confirmer 与 first confirmer 相同时，接口拒绝（4xx + 错误码）。  
4. apply 成功后自动生成新版本，且可在版本页查询到 checksum。  
5. 任一历史版本可发起回滚（同样双确认），回滚后配置内容与目标版本一致。  
6. Prod 环境必须输入确认文本，错误文本不可执行。

### 5) 风险与回退策略
- 风险：openclaw.json schema 演进导致前端表单失配。  
  - 缓解：后端输出 schemaVersion + 前端兼容层。  
  - 回退：降级为 JSON 只读 + 手工审批流程。  
- 风险：回滚执行失败影响稳定性。  
  - 缓解：执行前快照 + 原子化 apply/rollback job。  
  - 回退：自动回退到最近成功版本，并冻结写入口。

### 6) 预计工期（天）
- 开发：4 天
- 联调与修复：1 天
- 合计：**5 天**

---

## M3：运维操作台（诊断/日志/重启）与审计闭环（预计 4 天）

### 1) 目标与范围
- 实现诊断任务、日志检索、重启请求双确认执行。
- 打通 operation job 与审计日志，实现“请求-确认-执行-结果”全链路追溯。

### 2) 任务清单

#### 后端
- M3-BE-01：实现 `operation_job` 与 `audit_event`（append-only）模型与索引。
- M3-BE-02：实现 diagnostics run 接口与 job 状态流转。
- M3-BE-03：实现 logs query（时间、级别、关键词、traceId）。
- M3-BE-04：实现 restart request/confirm/execute（双确认 + env 校验）。
- M3-BE-05：统一 job 查询接口（进度、结果、错误码、traceId）。
- M3-BE-06：高风险操作 reason code 强制校验。

#### 前端
- M3-FE-01：Diagnostics 页面（健康矩阵 + 一键诊断 + 失败跳日志）。
- M3-FE-02：Logs 页面（级别过滤、关键词搜索、traceId、侧滑详情）。
- M3-FE-03：Operations 页面（重启模式、影响预估、二次确认输入）。
- M3-FE-04：Audit 页面（按 env/actor/action/resource 过滤）。
- M3-FE-05：P0/P1 告警展示（顶部横幅 + 导航角标）。

#### 联调
- M3-INT-01：重启流程全链路演练（request -> confirm1 -> confirm2 -> execute -> result）。
- M3-INT-02：重启失败注入，验证错误可定位到 traceId + 日志。
- M3-INT-03：审计对账：任一高风险操作均有完整 who/when/where/what/result。
- M3-INT-04：能力矩阵校验（不支持 restart 的 Gateway 禁用入口）。

### 3) API 合约冻结点
- `POST /api/v2/environments/{env}/gateways/{gatewayId}/diagnostics/run`
- `POST /api/v2/environments/{env}/gateways/{gatewayId}/logs/query`
- `POST /api/v2/environments/{env}/gateways/{gatewayId}/restart/request`
- `POST /api/v2/environments/{env}/restart-requests/{requestId}/confirm-first`
- `POST /api/v2/environments/{env}/restart-requests/{requestId}/confirm-second`
- `POST /api/v2/environments/{env}/restart-requests/{requestId}/execute`
- `GET /api/v2/environments/{env}/operations/{jobId}`
- `GET /api/v2/environments/{env}/operations/{jobId}/logs`

冻结内容：
- operation 状态机：`queued/running/succeeded/failed/cancelled`
- 审计最小字段：`actor,action,resource,traceId,createdAt,result`
- 错误码：`CAPABILITY_UNSUPPORTED`,`GATEWAY_UNREACHABLE`,`AUTH_403`

### 4) 验收标准（可测试）
1. 诊断任务可异步执行并可查询 job 状态与结果。  
2. 日志查询支持时间范围 + 级别 + 关键词联合过滤。  
3. 重启操作必须双确认，且 Prod 必须确认文本通过才可执行。  
4. 任一重启任务都可在审计页查到完整轨迹（请求/确认/执行/结果）。  
5. 失败任务可通过 `traceId` 在日志检索页定位错误上下文。  
6. 不支持 restart capability 的 Gateway，前后端都不可执行。

### 5) 风险与回退策略
- 风险：日志量大导致查询慢。  
  - 缓解：默认时间窗口 + 分页 + 索引（env, gateway_id, created_at, level）。  
  - 回退：限制历史窗口，仅保留近 24h 在线检索。  
- 风险：重启动作误触影响生产。  
  - 缓解：双确认 + 环境红色警示 + 文本确认 + reason 必填。  
  - 回退：紧急冻结 restart execute 接口，仅保留诊断与日志。

### 6) 预计工期（天）
- 开发：3 天
- 联调与修复：1 天
- 合计：**4 天**

---

## 4. 依赖与关键路径

关键路径：**M1 基线完成 -> M2 配置写路径 -> M3 运维执行闭环**。  
并行建议：
- FE 可提前实现 M2/M3 页面骨架与 Mock；
- BE 优先冻结 M1/M2 合约，减少联调返工。

---

## 5. 上线与回退总策略

### 上线顺序
1. 先在 dev 全量验证；
2. staging 灰度（至少 1 天观察）；
3. prod 分阶段开关：先读（Fleet/Logs）后写（Apply/Restart/Rollback）。

### 回退原则
- 优先回退“执行能力”（apply/restart/rollback）而保留“可观测能力”（status/logs）。
- 出现高风险异常时，立即切换为只读模式，并冻结高风险 API。

---

## 6. DoD（Definition of Done）

- 每个里程碑 API 合约已冻结并通过 contract test。  
- 自动化回归通过（核心路径 + 错误码 + 权限边界）。  
- 审计可追溯（M3 要求）且具备可用回退路径。  
- 文档与任务看板已同步更新。