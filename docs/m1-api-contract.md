# Agent Board v2 - M1 后端 API Contract（冻结）

> 版本：m1-contract-1.0  
> 日期：2026-03-08  
> 范围：只读 3 接口（Fleet 列表 / Gateway 详情 / Gateway 状态）

---

## 1) 全局约束

- Base URL: `/api/v2`
- Env Scope（必填）：`prod | staging | dev`
- 所有接口路径都必须显式包含 `environments/{env}`。
- M1 阶段仅只读，不提供任何配置写入/重启写操作。

### 标准错误体

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_403",
    "message": "Access denied by auth policy."
  }
}
```

### M1 约定错误码

- `AUTH_403`
- `GATEWAY_UNREACHABLE`
- `CAPABILITY_UNSUPPORTED`
- `ENV_SCOPE_REQUIRED`
- `ENV_SCOPE_INVALID`
- `GATEWAY_NOT_FOUND`

---

## 2) GET /api/v2/environments/{env}/gateways

### 用途
获取某环境下 Gateway 列表（带最新状态聚合）。

### Path Params
- `env`（必填）：`prod|staging|dev`

### 200 Response

```json
{
  "ok": true,
  "data": {
    "env": "dev",
    "total": 1,
    "gateways": [
      {
        "id": "gw-dev-01",
        "name": "Dev Gateway Alpha",
        "env": "dev",
        "region": "cn-sh-1",
        "endpoint": "ws://dev-gateway-alpha.local/ws",
        "tags": ["demo", "dev", "alpha"],
        "capabilities": { "diagnostics": true, "logs": true, "restart": true },
        "health": "healthy",
        "lastHeartbeatAt": "2026-03-08T06:22:03.101Z",
        "latencyMs": 79,
        "agentCount": 6,
        "sessionCount": 13,
        "updatedAt": "2026-03-08T06:22:10.000Z"
      }
    ]
  }
}
```

### 最小字段（冻结）
`id,name,env,capabilities,health,lastHeartbeatAt,latencyMs,agentCount,sessionCount`

---

## 3) GET /api/v2/environments/{env}/gateways/{gatewayId}

### 用途
获取单个 Gateway 详情（含 capabilities + 最新状态）。

### Path Params
- `env`（必填）：`prod|staging|dev`
- `gatewayId`（必填）

### Query Params
- `requireCapability`（可选）：如 `restart/logs/diagnostics`。若网关不支持则返回 `CAPABILITY_UNSUPPORTED`。

### 200 Response

```json
{
  "ok": true,
  "data": {
    "gateway": {
      "id": "gw-staging-01",
      "name": "Staging Gateway Beta",
      "env": "staging",
      "region": "cn-sh-2",
      "endpoint": "ws://staging-gateway-beta.local/ws",
      "tags": ["demo", "staging", "beta"],
      "capabilities": { "diagnostics": true, "logs": true, "restart": false },
      "health": "healthy",
      "lastHeartbeatAt": "2026-03-08T06:22:03.101Z",
      "latencyMs": 111,
      "agentCount": 8,
      "sessionCount": 18,
      "updatedAt": "2026-03-08T06:22:10.000Z"
    }
  }
}
```

---

## 4) GET /api/v2/environments/{env}/gateways/{gatewayId}/status

### 用途
获取单个 Gateway 状态与最近采样历史（30s 采样）。

### Path Params
- `env`（必填）：`prod|staging|dev`
- `gatewayId`（必填）

### Query Params
- `strict=1`（可选）：当网关 `health=down` 时直接返回 `GATEWAY_UNREACHABLE`（503）。

### 200 Response

```json
{
  "ok": true,
  "data": {
    "gatewayId": "gw-prod-01",
    "env": "prod",
    "status": {
      "health": "degraded",
      "lastHeartbeatAt": "2026-03-08T06:22:03.101Z",
      "latencyMs": 161,
      "agentCount": 14,
      "sessionCount": 35
    },
    "history": [
      {
        "gatewayId": "gw-prod-01",
        "env": "prod",
        "health": "degraded",
        "lastHeartbeatAt": "2026-03-08T06:22:03.101Z",
        "latencyMs": 161,
        "agentCount": 14,
        "sessionCount": 35,
        "collectedAt": "2026-03-08T06:22:10.000Z",
        "errorCode": null
      }
    ]
  }
}
```

---

## 5) 演示链路（前端可直连）

```bash
curl http://127.0.0.1:18901/api/v2/environments/dev/gateways
curl http://127.0.0.1:18901/api/v2/environments/staging/gateways/gw-staging-01
curl http://127.0.0.1:18901/api/v2/environments/prod/gateways/gw-prod-01/status
```

说明：接口由 `apps/multi-agent-dashboard/server.mjs` 提供，可与现有 Web 前端同域调用。
