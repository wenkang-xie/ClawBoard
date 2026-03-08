# agent-dashboard

当前是从 `~/.openclaw/workspace/apps/multi-agent-dashboard` 迁出的可运行演示版。

## 现在有什么
- 一个最小可运行的 dashboard demo server（`server.mjs`）
- `/fleet` 页面骨架
- Gateway 上下文切换与环境色编码
- 配置中心只读骨架
- 演示数据（dev / staging / prod）

## 启动
```bash
node server.mjs
```

打开：<http://127.0.0.1:18901/fleet>

如果端口占用：
```bash
PORT=18902 node server.mjs
```

## 目录
- `public/` 前端静态页面
- `data/` 演示数据
- `db/` 当前预留目录
- `docs/` 本轮规划/进展文档
