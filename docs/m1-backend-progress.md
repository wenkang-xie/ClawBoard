# Agent Board v2 - M1 后端进展报告

> 日期：2026-03-08  
> 范围：M1-BE-01 ~ M1-BE-05 + M1 只读 API 合约 + 最小演示数据链路

## 1) 本次完成项

- ✅ **M1-BE-01**：落盘 `gateway_registry` / `gateway_status_snapshot` 的迁移脚本骨架。
- ✅ **M1-BE-02**：在服务内实现 30s 轮询状态采集器，维持 latest snapshot + recent history（20 条）。
- ✅ **M1-BE-03**：实现 M1 三个只读接口：
  - `GET /api/v2/environments/{env}/gateways`
  - `GET /api/v2/environments/{env}/gateways/{gatewayId}`
  - `GET /api/v2/environments/{env}/gateways/{gatewayId}/status`
- ✅ **M1-BE-04**：实现 env scope 强校验（路径必须显式 `environments/{env}`，仅允许 `prod/staging/dev`）。
- ✅ **M1-BE-05**：统一错误码返回结构，覆盖 `AUTH_403 / GATEWAY_UNREACHABLE / CAPABILITY_UNSUPPORTED`。

## 2) API Contract 冻结

已新增并落盘：
- `/Users/wenkang/.openclaw/workspace/docs/agent-board/m1-api-contract.md`

说明：已固定请求路径、最小响应字段、错误码结构、示例请求与返回。

## 3) 演示数据链路（可供前端调用）

- 数据源：`apps/multi-agent-dashboard/data/gateway-registry.json`
- 运行服务：`apps/multi-agent-dashboard/server.mjs`
- 默认端口：`127.0.0.1:18901`
- 三环境演示数据：`dev/staging/prod` 均有至少 1 个 gateway。

快速验证：

```bash
node /Users/wenkang/.openclaw/workspace/apps/multi-agent-dashboard/server.mjs
curl http://127.0.0.1:18901/api/v2/environments/dev/gateways
curl http://127.0.0.1:18901/api/v2/environments/staging/gateways/gw-staging-01
curl http://127.0.0.1:18901/api/v2/environments/prod/gateways/gw-prod-01/status
```

## 4) 看板状态更新

已更新：`/Users/wenkang/.openclaw/workspace/tasks/agent-board-v2-running.md`

- `M1-BE-01 ~ M1-BE-05`：`done`
- `M1-INT-01`：`done`
- `M1-INT-02`：`doing`（已提供 flaky 场景，待与前端联调可视验证）

## 5) 风险与后续

### 当前风险
1. 当前为最小可运行基线，状态采集使用 demo simulation，尚未接入真实 Gateway health payload 适配。
2. 数据层迁移脚本已提供，但运行态仍为文件+内存快照模式，尚未接 PostgreSQL 实库。

### 建议下一步
1. 接入真实 Gateway adapter（统一 health normalize 逻辑）。
2. 把 snapshot 写入数据库并补 contract test。
3. 前端开始消费 M1 三接口，验证切换隔离与离线 30s 呈现。
