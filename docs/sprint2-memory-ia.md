# Sprint2 · Memory 页面 IA 与状态设计（MVP）

> 日期：2026-03-09  
> 目标：在现有深色 Dashboard 风格下，补齐 Memory 页面最小可用版，接入侧边栏/路由，并覆盖关键状态。

## 1) IA（信息架构）

## 页面布局（2 栏）
- **左栏：索引视图（Index Panel）**
  - 文件搜索（文件名/路径/标签）
  - 分类过滤（all/index/catalog/daily/archive/note）
  - 文件列表项：`name + relativePath + 更新时间 + size + 标签`
- **右栏：预览视图（Preview Panel）**
  - 文件元信息：更新时间、大小、行数、标签数
  - 文档结构：提取 markdown heading 作为 mini-outline
  - 正文预览：前 12000 字符（truncated 标识）

## 文件层级 / 分类策略
- `index`: MEMORY.md
- `catalog`: projects.md / infra.md / lessons.md / promotions.md
- `daily`: `YYYY-MM-DD.md`
- `archive`: `archive/**.md`
- `note`: 其他 markdown

## 标签策略
- 基础标签：`category`
- 时间标签：`YYYY-MM`（仅 daily 文件）
- 目录标签：top-folder（如 archive）
- 内容标签：从文件内 `#tag` 做最多 24 个提取（预览接口）

---

## 2) Sprint2 必做 vs 后置项

## Sprint2 必做（本次已落地）
1. Memory 页面路由与侧边栏入口（`/memory`）
2. Index + Preview 双栏骨架
3. 文件分类、搜索、过滤
4. 展示更新时间、大小、标签/分类
5. loading / empty / error / stale / partial-data 状态
6. BFF 提供 Memory 索引与单文件预览接口

## 后置项（Sprint3+）
1. 真正 markdown 渲染（代码高亮、链接跳转、目录锚点）
2. 编辑能力（草稿、保存、冲突处理）
3. 全文检索（跨文件内容搜索）
4. 大文件虚拟滚动 / 分段加载
5. 更多 IA 视图（树形目录折叠、时间线视图）

---

## 3) 组件拆解（前端）

- `MemoryPage`：页面状态编排、查询协同、状态横幅
- `MemoryIndexPanel`：搜索/分类/列表
- `MemoryPreviewPanel`：元信息+outline+正文预览
- `MemoryStateBanner`：error/partial/stale/empty 提示
- `useMemoryIndex`：拉取索引、扁平化、分类补全
- `useMemoryFilePreview`：按文件路径拉取预览

---

## 4) 状态设计落地

- **loading**：首屏索引加载用 `LoadingSpinner`
- **empty**：目录无 markdown 时显示 EmptyState
- **error**：索引请求失败显示错误 Banner + 重试
- **stale**：query stale 时显示缓存提示 + 手动刷新
- **partial-data**：
  - 目录扫描存在 warning（`partial=true`）
  - 或索引成功但预览失败

---

## 5) 待确认项

1. Memory 页面是否需要把 `~/.openclaw/workspace/memory` 之外的文档也纳入（当前仅加了 `MEMORY.md`）
2. 预览是否要直接支持 markdown 富文本（当前是纯文本预览）
3. 标签提取规则是否只保留“检索标签”行（当前是通用 `#tag`）
