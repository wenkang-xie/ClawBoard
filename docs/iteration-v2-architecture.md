# Agent 看板 v2 技术方案（多 Gateway + 配置中心 + 运维操作台）

> 版本：v2.0
> 状态：设计完成（待实施）
> 日期：2026-03-08
> 范围：#📊 Agent 看板迭代（多 Agent 规约）

---

## 1. 目标

在现有 Agent 看板基础上，新增两类核心能力：

1. **多 Gateway 管理**：统一纳管多个 Gateway 节点，支持按环境（dev/staging/prod）与标签分组。
2. **配置中心 + 运维操作台**：基于 `openclaw.json` 提供可视化配置查看、变更提交流程、诊断、日志查看、重启操作。

同时满足以下硬约束：

- 配置中心默认只读；写入与重启操作必须**二次确认**。
- 明确权限边界：查看（View）、编辑（Edit）、执行（Operate）。
- 设计需天然支持多环境扩展（dev/staging/prod）。

---

## 2. 方案选项

### 方案 A：前端直连各 Gateway（无控制平面）

- 优点：实现快、系统简单。
- 缺点：
  - 权限与审计分散在前端，难做统一风控。
  - 二次确认、回滚、审批链路难标准化。
  - 多环境一致性弱，运维动作不可追溯性高。

### 方案 B：新增「Agent Board Control Plane」（推荐）

- 前端只连控制平面，控制平面代理调用多个 Gateway。
- 配置版本、操作记录、权限策略统一管理。
- 可扩展审批、审计、回滚与环境隔离。

### 方案 C：把能力嵌入每个 Gateway（去中心化）

- 优点：单节点自治。
- 缺点：多节点策略一致性差，升级与治理成本高。

### 推荐方案

**选择方案 B（控制平面）**。原因：

- 满足“多 Gateway + 配置中心 + 运维操作”三者统一治理的最小复杂度路径。
- 最契合“权限边界、二次确认、审计闭环、多环境隔离”要求。
- 后续可平滑扩展审批流、告警流与自动化运维。

---

## 3. 架构分层与模块划分

## 3.1 分层架构

```text
[UI Layer]
  Agent Board Web
   ├─ Gateway总览
   ├─ 配置中心（只读默认）
   └─ 运维操作台（诊断/日志/重启）

[Control Plane API]
   ├─ Gateway Registry Service
   ├─ Config Center Service
   ├─ Ops Orchestrator Service
   ├─ AuthN/AuthZ Service
   └─ Audit Service

[Adapter Layer]
   ├─ Gateway RPC Adapter（health/exec/logs/restart）
   ├─ Config File Adapter（openclaw.json parse/validate/diff）
   └─ Secrets Adapter（token/credential 引用）

[Data Layer]
   ├─ PostgreSQL（元数据、版本、审计）
   ├─ Object Storage（大日志归档，可选）
   └─ Cache（状态快照，可选）
```

## 3.2 模块职责

1. **Gateway Registry Service**
   - 维护 Gateway 注册信息、环境归属、连接状态、能力标签（是否支持日志/重启）。
2. **Config Center Service**
   - 对 `openclaw.json` 做版本化托管（快照、diff、回滚）。
   - 默认只读；所有写入通过“变更请求 + 二次确认”流程。
3. **Ops Orchestrator Service**
   - 执行诊断、日志拉取、重启等操作。
   - 将操作统一映射为可审计的 Operation Job。
4. **AuthN/AuthZ Service**
   - 用户身份认证（SSO/API Token）。
   - RBAC + 环境范围控制（env-scoped permissions）。
5. **Audit Service**
   - 记录操作意图、确认动作、执行结果、回滚动作。
   - 支持追溯“谁、在何时、对哪个 Gateway、做了什么”。

---

## 4. 数据模型设计

> 核心覆盖：Gateway 注册、状态、操作记录、配置版本。

## 4.1 Gateway 注册（gateway_registry）

- `id` (uuid, pk)
- `env` (enum: dev/staging/prod)
- `name` (varchar)
- `endpoint` (varchar, ws/wss)
- `auth_ref` (varchar, 引用密钥，不明文存 token)
- `capabilities` (jsonb: {diagnostics:boolean, logs:boolean, restart:boolean})
- `tags` (jsonb)
- `status` (enum: active/inactive/deleted)
- `created_by`, `created_at`, `updated_at`

索引：`(env, name)` 唯一；`(env, status)` 普通索引。

## 4.2 Gateway 状态快照（gateway_status_snapshot）

- `id` (uuid, pk)
- `gateway_id` (fk)
- `env` (enum)
- `health` (enum: healthy/degraded/down)
- `latency_ms` (int)
- `agent_count` (int)
- `session_count` (int)
- `last_heartbeat_at` (timestamp)
- `raw_payload` (jsonb)
- `collected_at` (timestamp)

保留策略：近 7 天明细，历史按小时聚合。

## 4.3 配置文档（config_document）

- `id` (uuid, pk)
- `gateway_id` (fk)
- `env` (enum)
- `config_type` (enum: openclaw_json)
- `current_version` (varchar)
- `last_synced_at` (timestamp)

## 4.4 配置版本（config_version）

- `id` (uuid, pk)
- `config_document_id` (fk)
- `version` (varchar, 如 `2026.03.08.001`)
- `content` (jsonb, openclaw.json 全量快照)
- `diff_from_prev` (jsonb)
- `change_reason` (text)
- `change_ticket_id` (varchar)
- `created_by`, `created_at`
- `checksum` (varchar, 防篡改校验)

## 4.5 配置变更请求（config_change_request）

- `id` (uuid, pk)
- `gateway_id` (fk)
- `env` (enum)
- `base_version` (varchar)
- `proposed_patch` (jsonb/jsonpatch)
- `status` (enum: draft/pending_confirm/confirmed/applied/rejected/rolled_back)
- `first_confirm_by`, `first_confirm_at`
- `second_confirm_by`, `second_confirm_at`
- `apply_job_id` (fk->operation_job)
- `created_by`, `created_at`, `expires_at`

## 4.6 操作记录（operation_job）

- `id` (uuid, pk)
- `gateway_id` (fk)
- `env` (enum)
- `operation_type` (enum: diagnostics/log_fetch/restart/config_apply/config_rollback)
- `requested_by`
- `confirm_level` (smallint, 0/1/2)
- `status` (enum: queued/running/succeeded/failed/cancelled)
- `request_payload` (jsonb)
- `result_payload` (jsonb)
- `started_at`, `ended_at`
- `error_code`, `error_message`

## 4.7 审计事件（audit_event）

- `id` (uuid, pk)
- `env` (enum)
- `actor`
- `action` (enum: view_config/create_change/confirm_change/apply_change/restart_gateway/...)
- `resource_type`, `resource_id`
- `trace_id`
- `ip`, `user_agent`
- `before_snapshot` (jsonb, 可选)
- `after_snapshot` (jsonb, 可选)
- `created_at`

---

## 5. API 设计草案

> 前缀：`/api/v2`，所有接口必须带 `env` 作用域。

## 5.1 查询类（只读）

- `GET /environments/{env}/gateways`
  - 返回 Gateway 列表 + 最新状态。
- `GET /environments/{env}/gateways/{gatewayId}`
  - 返回 Gateway 详情 + capabilities。
- `GET /environments/{env}/gateways/{gatewayId}/status`
  - 返回健康状态、心跳、延迟、agent/session 概览。
- `GET /environments/{env}/gateways/{gatewayId}/config`
  - 默认返回 `openclaw.json` 脱敏视图（只读）。
- `GET /environments/{env}/gateways/{gatewayId}/config/versions`
  - 返回配置版本列表。

## 5.2 配置变更类（写入，需二次确认）

- `POST /environments/{env}/gateways/{gatewayId}/config/change-requests`
  - 创建变更请求（仅保存，不落地）。
- `POST /environments/{env}/change-requests/{requestId}/confirm-first`
  - 第一次确认（提交人或审核人按策略限制）。
- `POST /environments/{env}/change-requests/{requestId}/confirm-second`
  - 第二次确认（必须不同身份或不同凭证）。
- `POST /environments/{env}/change-requests/{requestId}/apply`
  - 触发应用；生成 `operation_job`。
- `POST /environments/{env}/gateways/{gatewayId}/config/rollback`
  - 回滚到指定版本（同样需二次确认）。

## 5.3 诊断类

- `POST /environments/{env}/gateways/{gatewayId}/diagnostics/run`
  - 执行健康诊断（连接、认证、channel、agent、session 基本检查）。
- `GET /environments/{env}/operations/{jobId}`
  - 查询诊断任务执行进度与结果。

## 5.4 日志类

- `POST /environments/{env}/gateways/{gatewayId}/logs/query`
  - 按时间范围/级别关键字查询。
- `GET /environments/{env}/operations/{jobId}/logs`
  - 获取长任务日志流。

## 5.5 重启类（高风险，需二次确认）

- `POST /environments/{env}/gateways/{gatewayId}/restart/request`
  - 创建重启请求。
- `POST /environments/{env}/restart-requests/{requestId}/confirm-first`
- `POST /environments/{env}/restart-requests/{requestId}/confirm-second`
- `POST /environments/{env}/restart-requests/{requestId}/execute`

返回规范：
- 同步动作返回 `requestId/jobId`。
- 异步动作统一查询 `operation_job`。
- 错误码约定：`AUTH_403`, `CONFIRMATION_REQUIRED`, `CAPABILITY_UNSUPPORTED`, `GATEWAY_UNREACHABLE`, `ROLLBACK_FAILED`。

---

## 6. 权限边界与安全审计设计

## 6.1 权限模型（RBAC + Env Scope）

角色建议：

- **Viewer**：可查看 Gateway、状态、配置脱敏视图、日志查询结果。
- **ConfigEditor**：可创建配置变更请求、查看 diff；不能直接 apply。
- **Operator**：可执行诊断与日志任务；重启需双确认策略。
- **Admin**：具备跨环境授权、回滚授权、紧急处置权限。

权限边界（核心）：

- 查看（View）：`GET` 类接口。
- 编辑（Edit）：创建/修改 change request，但不直接生效。
- 执行（Operate）：apply、restart、rollback 等高风险动作。

## 6.2 二次确认机制

适用动作：`config_apply`, `config_rollback`, `gateway_restart`。

确认规则：

1. **双阶段确认**：first + second，均写入审计日志。
2. **双人/双凭证约束**（推荐至少满足其一）：
   - second confirmer 不得与 first confirmer 相同；或
   - second confirmer 需更高权限与二次认证。
3. **确认有效期**：如 10 分钟超时自动失效。
4. **执行前快照**：执行前保存当前配置版本，确保可回滚。

## 6.3 审计与合规

- 审计最小字段：`who/when/where/what/result/traceId`。
- 审计日志追加写（append-only），禁止覆盖更新。
- 高风险操作（重启/回滚）需强制填写原因（reason code + free text）。
- 提供审计检索接口：按环境、操作者、Gateway、动作类型过滤。

## 6.4 回滚策略

- 配置回滚：选择历史版本 -> 二次确认 -> 生成 rollback job。
- 运维回滚：重启失败时自动执行健康探测与告警；必要时触发备用 Gateway 切换（后续扩展）。
- UI 显示“最近一次可回滚版本”与“影响范围预估”。

---

## 7. 实施步骤（M1 / M2 / M3）

## M1：多 Gateway 可观测与注册（2 周）

交付：
- Gateway Registry + 状态采集链路。
- 看板支持按环境查看多个 Gateway 的健康状态。
- 基础 RBAC（Viewer/Operator）落地。

验收：
- 至少 3 环境（dev/staging/prod）可独立展示。
- Gateway 离线/降级可在 30s 内反映。

## M2：配置中心（只读默认 + 变更请求）（2~3 周）

交付：
- `openclaw.json` 脱敏展示。
- 配置版本管理（快照、diff、版本历史）。
- 变更请求流程（draft -> 双确认 -> apply）。

验收：
- 所有写入动作都必须经过二次确认。
- 任意版本可一键回滚（仍需二次确认）。

## M3：运维操作台（诊断/日志/重启）+ 审计闭环（2 周）

交付：
- 诊断任务、日志查询、重启请求流程。
- 统一 Operation Job 跟踪与结果回传。
- 完整审计检索与导出。

验收：
- 重启动作全链路可追溯（请求、确认、执行、结果）。
- 操作失败支持可视化定位（错误码 + 日志 + traceId）。

---

## 8. 风险与回滚

1. **风险：多 Gateway 能力不一致（部分节点不支持日志/重启）**
   - 缓解：capabilities 显式建模，UI 仅开放可用操作。

2. **风险：配置变更误操作影响生产**
   - 缓解：默认只读 + 双确认 + 执行前快照 + 强制理由。

3. **风险：审计数据量增长快**
   - 缓解：冷热分层存储，按月归档；查询走索引与时间分区。

4. **风险：跨环境权限串扰**
   - 缓解：所有 API 强制 env scope，token 内嵌 env claim。

回滚总原则：
- “配置可回滚、操作可追溯、权限可收敛”。
- 出现高风险异常时，先冻结写入入口，仅保留查看与诊断能力。

---

## 9. 与多 Agent 规约的对齐

- 统一“查看 / 编辑 / 执行”权限边界，避免 Agent 越权操作。
- 所有高风险动作显式确认与审计，满足可解释与可追责。
- 环境隔离（dev/staging/prod）与版本治理可支撑后续多 Agent 协作扩展。

---

## 10. 后续可扩展项（v2.x）

- 审批策略引擎（按环境、时间窗、风险等级自动要求额外审批）。
- 变更影响分析（基于历史故障与依赖关系给出风险评分）。
- 与告警平台联动（重启失败自动通知与升级）。
