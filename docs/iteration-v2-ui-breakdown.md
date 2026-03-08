# Agent Board v2 UI 任务拆解（可执行前端清单）

> 输入基线：`iteration-v2-ux.md`（delivery-plan 暂缺，当前以 UX 方案直接拆解）
> 目标：让前端开发可按任务直接落地，覆盖页面、组件、状态、验收。

---

## 0. 交付边界与全局约束

- 端类型：Web 管理台（默认 Next.js + Tailwind）
- 全局路由上下文：`gatewayId + env + region` 必须在所有页面顶部固定可见
- 高风险动作（Apply / Restart / Rollback）必须双确认：
  - 第一步：确认目标对象与环境（大号 ENV 标签 + Gateway 别名）
  - 第二步：文本确认（精确匹配）
- 多 Gateway 切换必须防上下文误判：
  - 切换后清空上一个 Gateway 的暂存筛选与“可执行操作态”
  - 若存在未保存草稿，阻断切换并给出保存/放弃/取消

---

## 1. 页面级任务（按模块拆解）

## 1.1 Fleet（`/fleet`）

### 任务列表
- [ ] 实现环境过滤器：All / Prod / Staging / Dev
- [ ] 实现风险汇总条：P0/P1 计数 + 最近更新时间
- [ ] 实现 Gateway 卡片矩阵（紧凑卡片）
  - 名称、环境标签、连接状态、最后心跳
  - 在线 Agent 数、错误率、最近变更、待处理告警
- [ ] 卡片点击打开右侧抽屉：最近操作时间线（Apply/Restart/Rollback）
- [ ] 支持按关键字搜索 Gateway（名称/别名）
- [ ] 支持收藏 Gateway（固定在前）

### 实现要点
- ENV 色彩规范：Prod 红、Staging 橙、Dev 蓝灰
- 卡片危险态（P0/P1）提升视觉优先级（边框+角标+顶部提示）
- 抽屉内操作记录需要可跳转到详情页（变更单 / 操作页）

---

## 1.2 Configs（`/gateway/:gatewayId/configs`）

### 任务列表
- [ ] 实现三栏布局：模块树 / 编辑区 / 影响分析区
- [ ] 编辑区支持 Form/JSON 双视图切换
- [ ] 接入实时校验（语法 + 语义）
- [ ] 实现底部 Sticky 操作栏：保存草稿 / 查看 Diff / 应用到 Gateway
- [ ] 未保存离开拦截（路由跳转 + Gateway 切换）
- [ ] 敏感字段默认遮罩，支持显式展开
- [ ] 并发编辑冲突提示（检测远端版本变更）

### 实现要点
- Prod 环境编辑态边框增加警示线
- “应用到 Gateway”按钮在 Prod 下默认 secondary（需审阅后激活）
- 影响分析区必须显示：影响组件、依赖健康、风险等级

---

## 1.3 Diff & Apply（`/gateway/:gatewayId/changes/:changeId`）

### 任务列表
- [ ] 实现变更元信息头部：变更单号、操作人、目标、环境、时间
- [ ] 实现左右对比 Diff Viewer（Before/After）
- [ ] 字段级标识：新增/删除/修改
- [ ] 敏感字段标记（token/auth/路由策略）
- [ ] 风险摘要卡：影响服务数、是否需重启、敏感项数量
- [ ] 变更说明输入（必填）
- [ ] 应用流程双确认弹窗（Step1 上下文确认 + Step2 文本确认）
- [ ] 成功后展示：变更记录 + 回滚点 ID

### 实现要点
- Confirm 文本规则示例：`APPLY <gateway-alias>`（大小写严格）
- Prod 额外勾选：`我已确认影响范围`
- Apply 按钮 enable 条件：校验通过 + 说明必填 + 双确认通过

---

## 1.4 Diagnostics & Logs
- 诊断：`/gateway/:gatewayId/diagnostics`
- 日志：`/gateway/:gatewayId/logs`

### 任务列表
- [ ] 诊断页实现健康检查矩阵（内部组件 + 外部依赖）
- [ ] 一键诊断操作（时间窗口选择）
- [ ] 失败项可跳转日志页并带过滤参数
- [ ] 日志检索条件区：时间/模块/等级/traceId/关键词
- [ ] 日志结果表（高密模式）+ 侧滑详情
- [ ] 详情联动关联变更与重启事件

### 实现要点
- 查询条件支持 URL 同步，便于分享与复现
- 日志表必须提供“冻结关键列”（时间、等级、模块）
- traceId 点击可一键复制并作为过滤条件回填

---

## 1.5 Operations（重启/回滚）
- 重启：`/gateway/:gatewayId/operations/restart`
- 回滚：`/gateway/:gatewayId/operations/rollback`

### 任务列表
- [ ] Tab 化界面：Restart / Rollback
- [ ] Restart 模式选择：优雅 / 滚动 / 强制
- [ ] 重启前检查：依赖健康、当前告警、最近变更
- [ ] 影响预估展示：中断时间、影响会话数
- [ ] 执行重启双确认（文本：`RESTART <gateway-alias>`）
- [ ] 回滚时间线列表（版本号/摘要/操作人/时间）
- [ ] 版本选择后展示反向 Diff
- [ ] 执行回滚双确认（文本：`ROLLBACK <version-id>`）
- [ ] 回滚后提示是否执行重启（策略化）

### 实现要点
- 强制重启默认折叠 + 二次风险提示
- 回滚入口必须显示“将撤销字段列表”
- 高风险操作必须记录操作原因（必填）

---

## 2. 组件级任务（核心复用组件）

## 2.1 Gateway Switcher

### 功能点
- [ ] 显示 Gateway 名称、ENV、Region、连接状态
- [ ] 支持搜索、筛选（按 ENV）、收藏
- [ ] 最近使用列表
- [ ] 切换前草稿拦截

### 交互约束
- 切换成功后顶部 Context Chip 动画更新（避免误以为未切换）
- 切换后触发全局事件：`gatewayContextChanged`
- 所有危险按钮在上下文变更后重置为 disabled

### 验收点
- 在 500 个 Gateway 数据量下，搜索响应 < 200ms（前端侧）
- 切换后 300ms 内页面主标题与 ENV 标签必须同步更新

---

## 2.2 Risk Banner

### 功能点
- [ ] 支持 P0/P1/P2/P3 四级视觉样式
- [ ] 支持页面级固定与模块内嵌两种模式
- [ ] 支持告警摘要 + 展开详情
- [ ] 支持跳转动作（去诊断、去日志、去操作）

### 验收点
- P0 在任意页面首屏可见
- 同屏多个 Banner 时，P0/P1 排序优先

---

## 2.3 Confirm Modal（双确认）

### 功能点
- [ ] Step1：目标确认（Gateway + ENV + 动作）
- [ ] Step2：文本确认输入 + 精确校验
- [ ] 附加字段：执行原因（必填）、工单号（可配置必填）
- [ ] 支持倒计时解锁确认按钮（可配，Prod 默认 3 秒）

### 验收点
- 文本不匹配时不可提交
- 网关上下文变化后，已打开 Modal 自动失效并提示“上下文已变更，请重新确认”

---

## 2.4 Diff Viewer

### 功能点
- [ ] JSON/结构化字段双模式
- [ ] 新增/删除/修改行高亮
- [ ] 敏感字段高风险标记
- [ ] 仅看变更项过滤开关
- [ ] 大文本折叠与按需展开

### 验收点
- 1000 行 diff 渲染不卡顿（首屏渲染 < 1.5s）
- 敏感字段标记准确率 100%（基于规则字典）

---

## 2.5 Log Table

### 功能点
- [ ] 高密列表 + 虚拟滚动
- [ ] 列筛选、排序、字段显隐
- [ ] 行展开查看上下文
- [ ] traceId/请求ID 一键复制
- [ ] 与诊断结果联动过滤

### 验收点
- 10k 行前端虚拟列表滚动平稳，无明显掉帧
- 列配置刷新后可恢复（本地持久化）

---

## 3. 状态设计（empty / loading / error / critical）

## 3.1 Empty
- Fleet 空：引导“创建 Gateway / 取消过滤器”
- Configs 空：引导“选择模块开始编辑”
- Logs 空：引导“放宽时间范围或关键词”
- Operations 空：提示“暂无可回滚版本/暂无重启记录”

## 3.2 Loading
- 页面骨架：卡片骨架/表格骨架/详情骨架分层加载
- 局部加载优先：避免全屏 blocker
- Gateway 切换时显示顶部 Context Loading 条，禁止危险操作

## 3.3 Error
- 请求失败必须给出：错误摘要 + 重试按钮 + 诊断入口
- 表单校验错误定位到字段并自动滚动
- 日志查询失败保留原查询条件，支持一键重试

## 3.4 Critical
- P0/P1 使用固定位置 Risk Banner + 导航角标
- 高风险动作页出现 Critical 时，默认禁用执行按钮并要求先处理阻塞项
- Restart/Rollback 执行失败进入“故障恢复态”：提供回滚/重试/导出诊断

---

## 4. 前端验收点（可测试）

## 4.1 上下文一致性
- [ ] 任意页面始终可见 `Gateway + ENV + Region`
- [ ] Gateway 切换后，所有页面标题、筛选、危险按钮状态同步重置
- [ ] 旧上下文返回结果不会覆盖新上下文 UI（需请求取消或版本戳保护）

## 4.2 高风险动作防误触
- [ ] Apply/Restart/Rollback 均需双确认（含文本）
- [ ] 文本确认规则严格匹配，错误输入不可提交
- [ ] Prod 下默认附加确认项（影响范围勾选、原因必填）

## 4.3 可追溯性
- [ ] Apply 成功后返回并展示 changeId + rollbackPoint
- [ ] Restart/Rollback 执行结果可在操作时间线中检索
- [ ] 日志详情可关联最近变更与操作事件

## 4.4 性能与可用性
- [ ] Fleet 搜索、Log Table 滚动、Diff 渲染满足性能阈值
- [ ] 异常态都有可行动下一步（重试/诊断/回退）
- [ ] 关键操作支持键盘可达（Tab/Enter/Esc）

## 4.5 回归测试建议（E2E）
- [ ] Case-01：Prod 下配置修改 → Diff → 双确认 Apply 成功
- [ ] Case-02：Gateway 切换中存在未保存草稿 → 阻断弹窗流程完整
- [ ] Case-03：Restart 失败后一键进入回滚并完成双确认
- [ ] Case-04：日志 traceId 跳转诊断链路保持同一上下文

---

## 5. 开发执行顺序（建议）

1. 全局框架与 Gateway Context（含 Switcher）
2. Confirm Modal（双确认基座）+ Risk Banner
3. Configs + Diff Viewer 主链路
4. Operations（Restart/Rollback）
5. Diagnostics & Logs（含 Log Table 性能优化）
6. 全链路 E2E 与误操作防护回归

> 备注：若后续补齐 `iteration-v2-delivery-plan.md`，本清单可直接映射为 sprint backlog（按页面+组件双维度拆分）。
