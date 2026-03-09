# Sprint1 · Session 详情页 IA 与前端拆解（可执行版）

更新时间：2026-03-09
范围：`/Users/wenkang/repos/agent-dashboard`（仅 Sprint1）

---

## 1) 现状检查（sessions 相关）

已存在：
- `src/pages/SessionsPage.tsx`
  - list/tree 两种视图切换
  - 数据来自 `useSessions()` + `useRunsJson()`
- `src/components/sessions/SessionList.tsx`
  - 本地过滤（agent/channel/search）
- `src/components/sessions/SessionRow.tsx`
  - 行展开拉取 `useSessionHistory()`，可看简版历史
- `src/components/sessions/SessionTree.tsx`
  - 基于真实 runs + session store 弱推导看上下游

当前痛点：
- 详情页路由缺失（用户无法稳定定位一个 session）
- 详情信息分散在“列表行展开 + tree”，上下文跳转成本高
- 状态模型不完整（stale / partial-data 未显式落 UI）

---

## 2) Session 详情页 IA（信息架构）

建议采用「1 页 6 区」结构：

1. **头部（Header）**
   - 返回 Sessions
   - 主标题 + sessionKey（全量/可截断）
   - 状态徽标：活跃中 / 稳定 / 空闲；附加 stale / partial-data

2. **摘要区（Overview Cards）**
   - Agent/Channel
   - Tokens（total/in/out）
   - Model（provider）
   - 更新时间（绝对时间 + 相对时间）

3. **运行状态区（Runtime State）**
   - 数据获取状态（loading / done）
   - 错误状态（none / error message）
   - 新鲜度（fresh / stale）
   - 完整度（complete / partial-data）
   - 最近成功刷新时间

4. **日志/事件区（Logs & Events）**
   - 按时间展示 messages
   - role、model、timestamp、content
   - empty/error 独立展示

5. **上下游关系区（Relations）**
   - 上游：谁触发了该 session（优先 incoming runs，缺失时用 spawnedBy 推导）
   - 下游：该 session 触发了谁（优先 outgoing runs，缺失时反向聚合 spawnedBy）
   - 关联：同 groupId / 同主线程 channel 的弱关系
   - 每条关系显示状态、耗时或最近活跃时间、reason 摘要

6. **元信息区（Meta）**
   - 解析后的 sessionKey 结构：scope/agent/channel/chatType/target
   - groupChannel / sessionId / space / accountId 等低频排障字段

---

## 3) 状态设计（Sprint1 必落）

### loading
- 条件：`sessions + history` 初次加载且无缓存
- 表现：整页 LoadingSpinner（避免空白）

### empty
- 条件：session 不存在且 history 为空
- 表现：empty banner（可能被清理/切网关）

### error
- 条件：请求失败且无可显示数据
- 表现：error banner + 重试按钮

### stale
- 条件：React Query `isStale=true`
- 表现：warning banner + “立即刷新”

### partial-data
- 条件示例：
  - summary 有，但 history 拉取失败
  - summary 缺失，但 history 仍有缓存
- 表现：warning banner，不阻断主内容阅读

---

## 4) 从 Session 列表进入详情页的交互建议

### Sprint1 最小可用（已落地）
- 保留当前“点击行展开历史”交互
- 新增行右侧 **“详情”按钮**，进入 `/sessions/:sessionKey`

### 推荐后续增强（后置）
- 支持 `Enter` 键进入详情（可访问性）
- 详情页返回时恢复列表筛选状态（URL 化 filter）
- 支持“在新标签打开详情”

---

## 5) 组件拆分建议（可直接给前端）

### Sprint1 已落地组件
- `SessionDetailHeader`
- `SessionOverviewCards`
- `SessionRuntimeSection`
- `SessionEventsSection`
- `SessionRelationsSection`
- `SessionMetaSection`
- `SessionDetailStateBanner`

### 数据与工具层
- `src/pages/SessionDetailPage.tsx`（编排 query + 状态聚合）
- `src/lib/sessionDetail.ts`（key 解析、时间标准化、关系切分）

### 可后置组件（Sprint1 不必做）
- `SessionTimeline`（合并消息和 run 成统一时间线）
- `SessionGraphMiniMap`（图形化上下游）
- `SessionDiffPanel`（两次状态快照对比）

---

## 6) Sprint1 必做 vs 可后置

### Sprint1 必做
- ✅ 详情页路由打通（可直达）
- ✅ 头部/摘要/运行状态/日志/上下游/元信息 6 区块
- ✅ loading/empty/error/stale/partial-data 可视化
- ✅ 列表到详情的入口

### 可后置（Sprint2+）
- ⏸ 统一事件流（messages+runs+system events）
- ⏸ 图形化关系图谱
- ⏸ 更丰富筛选（role/model/time range）
- ⏸ 字段级 Diff / 诊断跳转

---

## 7) 与本地 BFF 对接建议（字段前置，不强依赖 freeze）

详情页最小字段建议：
- `summary`: key, displayName, channel, agentId, updatedAt, tokens, model/provider
- `history`: messages[] (role/content/timestamp/model)
- `relations`: incoming[] / outgoing[] / related[]（真实 + 弱推导混合）
- `meta`: sessionId, groupChannel, space, lastTo, lastAccountId
- `freshness`: fetchedAt, sourceLagMs（可选）

对接策略：
- Sprint1 允许“多源拼装”（gateway + 本地 BFF）
- 任一子源失败即 partial-data，不阻断渲染

---

## 8) 本次骨架落地文件

- `src/pages/SessionDetailPage.tsx`
- `src/components/sessions/detail/SessionDetailHeader.tsx`
- `src/components/sessions/detail/SessionOverviewCards.tsx`
- `src/components/sessions/detail/SessionRuntimeSection.tsx`
- `src/components/sessions/detail/SessionEventsSection.tsx`
- `src/components/sessions/detail/SessionRelationsSection.tsx`
- `src/components/sessions/detail/SessionMetaSection.tsx`
- `src/components/sessions/detail/SessionDetailStateBanner.tsx`
- `src/lib/sessionDetail.ts`
- `src/App.tsx`（新增详情路由）
- `src/components/sessions/SessionList.tsx`（新增详情列）
- `src/components/sessions/SessionRow.tsx`（新增详情按钮）
- `src/pages/SessionsPage.tsx`（提示文案补充）

---

## 9) 运行与验证

```bash
cd /Users/wenkang/repos/agent-dashboard
npm run dev
```

验证路径：
1. 打开 `/sessions`
2. 在任一行点击“详情”
3. 观察 6 区块是否渲染
4. 断网或切错网关，检查 error/partial/stale 展示是否可读
5. 进入一个有 subagent 关系的 session，确认 relations 不再是纯空 stub
6. 返回 `/sessions` 切到“流转树”，确认 runs 数据已由 BFF 提供
