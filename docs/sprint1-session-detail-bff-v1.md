# Sprint1 技术拆解：Session 详情页 + 本地 BFF（v1）

> 范围限定：仅覆盖 Sprint1（Session 详情页 + 本地 BFF）。不涉及 Memory 页面、Token 看板增强、Tasks 自动轮询、多 Agent memory、新建任务入口。

## 1) 现状盘点 & 最小闭环数据

### 仓库现状（已确认）
- 已有 Session 列表页：`src/pages/SessionsPage.tsx`
- 已有 Session 详情组件组：`src/components/sessions/detail/*`
- 已有详情页入口：`src/pages/SessionDetailPage.tsx` + `/sessions/:sessionKey` 路由
- **阻塞点**：`useSessionHistory` 依赖 `sessions.history`，但当前 Gateway 无该方法（应使用 `sessions.preview` / `sessions.usage.logs`）
- 本地 BFF 已有基础：`server/index.js`（仅 tasks/memory）

### Session 详情页最小可用闭环（MVP）
必须具备：
1. **会话基本信息**：`key / agentId / channel / model / token / updatedAt / sessionId`
2. **事件流**：至少能展示最近 N 条消息（role + content + timestamp 可选）
3. **运行摘要**：usage 概览（tokens/cost/messageCounts/toolUsage）
4. **降级可见**：部分数据失败时仍可展示已成功数据（partial 模式）

非 Sprint1 必需（可先降级）：
- 上下游关系可演示闭环（优先读取 `~/.openclaw/subagents/runs.json`，缺失时用 `sessions.json` 的 `spawnedBy/groupId` 做弱推导）

---

## 2) 本地 BFF Contract v1

Base URL：`http://127.0.0.1:18902`

### 2.1 GET `/api/sessions`
用于列表页/详情页兜底拉取会话基础元数据。

**Query**
- `limit?: number`（1~1000，默认 200）
- `search?: string`
- `agentId?: string`
- `label?: string`

**Response (200)**
```json
{
  "ok": true,
  "ts": 1773068000000,
  "data": {
    "ts": 1773067999000,
    "count": 72,
    "sessions": [
      {
        "key": "agent:architect:subagent:...",
        "updatedAt": 1773067509843,
        "model": "gpt-5.3-codex",
        "modelProvider": "openai-codex",
        "totalTokens": 2488840
      }
    ]
  }
}
```

### 2.2 GET `/api/sessions/:sessionKey/detail`
Session 详情聚合接口（Sprint1 主接口）。

**Query**
- `eventsLimit?: number`（10~500，默认 120）
- `previewLimit?: number`（1~100，默认 24）
- `maxChars?: number`（100~6000，默认 1800）
- `pointLimit?: number`（20~300，默认 120）
- `relationLimit?: number`（1~50，默认 10）
- `relatedLimit?: number`（0~20，默认 6）
- `force=1`（可选，跳过缓存）

**Response (200)**
```json
{
  "ok": true,
  "ts": 1773068000000,
  "cache": { "hit": false, "ttlMs": 8000 },
  "data": {
    "sessionKey": "agent:architect:subagent:...",
    "session": { "key": "...", "updatedAt": 1773067509843, "model": "..." },
    "messages": [
      { "role": "toolResult", "content": "...", "timestamp": 1773067743482 }
    ],
    "usage": {
      "totalTokens": 2488840,
      "totalCost": 1.4022,
      "messageCounts": { "total": 45, "assistant": 44 },
      "toolUsage": { "totalCalls": 46, "uniqueTools": 2 }
    },
    "timeseries": {
      "sessionId": "def2cf53-...",
      "points": [
        { "timestamp": 1773067523539, "totalTokens": 13052, "cumulativeTokens": 13052 }
      ]
    },
    "relations": {
      "incoming": [],
      "outgoing": [
        {
          "id": "outgoing:run-123",
          "kind": "run",
          "sessionKey": "agent:architect:subagent:...",
          "source": "subagents.runs.json",
          "derived": false
        }
      ],
      "related": [
        {
          "id": "related:session-registry:agent:main:discord:...",
          "kind": "session",
          "sessionKey": "agent:main:discord:...",
          "source": "session-registry",
          "derived": true,
          "reason": "命中主线程 channel ↔ 子会话 groupId"
        }
      ],
      "weakInferenceUsed": true,
      "warnings": []
    },
    "partial": false,
    "eventSource": "sessions.usage.logs",
    "warnings": []
  }
}
```

### 2.2a GET `/api/runs`
读取本机 `~/.openclaw/subagents/runs.json`，供列表树和详情 relations 使用。

### 2.2b GET `/api/sessions/:sessionKey/relations`
独立 relations 接口。优先返回真实 runs 关系；若当前 session 未命中 runs，则回退到 `~/.openclaw/agents/*/sessions/sessions.json` 中的 `spawnedBy/groupId` 做弱推导。

### 2.3 GET `/api/sessions/:sessionKey/events`
独立事件流接口（调试/按需刷新用）。

**Query**
- `limit?: number`（10~500，默认 120）
- `previewLimit?: number`（1~100，默认 24）
- `maxChars?: number`（100~6000，默认 1800）

**Response (200)**
```json
{
  "ok": true,
  "ts": 1773068000000,
  "data": {
    "sessionKey": "agent:architect:subagent:...",
    "source": "sessions.usage.logs",
    "events": [{ "role": "assistant", "content": "..." }],
    "partial": false,
    "warnings": []
  }
}
```

### 2.4 错误结构（统一）
```json
{
  "ok": false,
  "ts": 1773068000000,
  "error": {
    "code": "GATEWAY_CALL_FAILED",
    "message": "sessions.list 调用失败",
    "details": "..."
  }
}
```

建议错误码：
- `INVALID_SESSION_KEY`
- `GATEWAY_CALL_FAILED`
- `SESSION_DETAIL_FAILED`
- `SESSION_EVENTS_FAILED`
- `NOT_FOUND`

### 2.5 缓存与轮询策略
- BFF 聚合接口：内存缓存 TTL `8s`（避免频繁 gateway call）
- 前端 `useSessionDetail`：`refetchInterval=15s`，`staleTime=10s`
- 手动刷新：`force=1` 或 `query.refetch()`

---

## 3) stub/mock 还是直连数据源？

结论：**Sprint1 可直接接现有数据源，不需要先做 mock**。

原因：
- Gateway 已提供关键方法：`sessions.list`、`sessions.preview`、`sessions.usage`、`sessions.usage.timeseries`、`sessions.usage.logs`
- 详情页必须字段均可由上述接口拼出
- relations 优先取 `~/.openclaw/subagents/runs.json` 真实数据，缺失时再用本机 `sessions.json` 做稳定弱推导

---

## 4) 最小实现顺序（文件级）

1. **修复历史来源（先止血）**
   - `src/hooks/useSessions.ts`
   - `useSessionHistory` 从 `sessions.history` 切换到 `sessions.preview`

2. **扩展 BFF 会话接口**
   - `server/index.js`
   - 新增：`/api/runs`、`/api/sessions`、`/api/sessions/:sessionKey/detail`、`/api/sessions/:sessionKey/relations`、`/api/sessions/:sessionKey/events`
   - 增加 gateway 调用封装、错误结构、8s 缓存

3. **前端详情查询切到 BFF**
   - 新增：`src/hooks/useSessionDetail.ts`
   - 改造：`src/pages/SessionDetailPage.tsx`

4. **联调验证**
   - 启动 BFF + 前端后打开 `/sessions/:sessionKey`
   - 验证：基础信息、事件流、relations（真实或弱推导）、partial/stale 提示、刷新行为

---

## 5) 高风险/阻塞点

1. **Gateway CLI 可用性依赖**
   - BFF 通过 `openclaw gateway call` 聚合数据，若本机未登录/未启动 gateway，会直接失败

2. **日志内容体积大**
   - `sessions.usage.logs` 可能返回超长文本；已通过 `maxChars` 截断

3. **relations 数据面存在分层降级**
   - 首选 `subagents/runs.json`；若无命中，则退化到 `agents/*/sessions/sessions.json` 的 `spawnedBy/groupId`，至少保证不是纯空 stub

4. **多请求聚合失败的部分可用策略**
   - 某个上游方法失败时不应拖垮全页；已在 contract 中定义 `partial + warnings`

---

## 当前落地进展（本次已推进）

已完成代码侧实现准备：
- `server/index.js`：新增 Session BFF v1 聚合与错误规范
- `src/hooks/useSessionDetail.ts`：新增详情 BFF hook
- `src/pages/SessionDetailPage.tsx`：改为消费 BFF 聚合数据
- `src/hooks/useSessions.ts`：历史接口改为 `sessions.preview`

启动方式（建议）：
1. 启动 BFF：`node server/index.js`
2. 启动前端：`npm run dev`
3. 浏览器访问：`/sessions` → 点“详情”进入 `/sessions/:sessionKey`


## 6) Sprint1 验证命令（补充）

```bash
cd /Users/wenkang/repos/agent-dashboard
npm install
npm run bff
# 另一个终端
npm run dev

# smoke test 1: detail
curl -s "http://127.0.0.1:18902/api/sessions/agent%3Amain%3Adiscord%3Achannel%3A1478807002825359490/detail" | jq ".data.sessionKey, .data.eventSource, .data.relations | {incoming: (.incoming|length), outgoing: (.outgoing|length), related: (.related|length)}"

# smoke test 2: events
curl -s "http://127.0.0.1:18902/api/sessions/agent%3Amain%3Adiscord%3Achannel%3A1478807002825359490/events" | jq ".data.source, (.data.events|length)"

# smoke test 3: relations
curl -s "http://127.0.0.1:18902/api/sessions/agent%3Amain%3Adiscord%3Achannel%3A1478807002825359490/relations" | jq ".data | {incoming: (.incoming|length), outgoing: (.outgoing|length), related: (.related|length), weakInferenceUsed}"
```
