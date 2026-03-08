# Agent 看板迭代 V2 不确定项 Spike 验证计划

## 结论摘要

1. **logs.tail** API 已实现且稳定，但 **logs.query 不存在**（仅有 tail）
2. **agents.restart API 不存在**，当前仅有 list/create/update/delete/files 操作
3. **配置热加载机制已实现**，支持 hybrid/hot/restart/off 四种模式，但部分配置变更仍需重启

---

## 1. logs.tail / logs.query API 稳定性

### 验证方法

**步骤：**
1. 启动 gateway: `openclaw gateway start`
2. 测试 logs.tail 基本调用：
   ```bash
   openclaw logs tail --limit 10
   ```
3. 测试带参数的调用：
   ```bash
   openclaw logs tail --limit 50 --max-bytes 100000
   ```
4. 测试 follow 模式：
   ```bash
   openclaw logs tail --follow --interval 500
   ```
5. 测试 RPC 调用（通过 curl/grpc）：
   ```json
   { "method": "logs.tail", "params": { "cursor": 0, "limit": 10 } }
   ```

### 成功判定

- logs.tail 返回有效 JSON，包含 `lines`, `cursor`, `size`, `file` 字段
- follow 模式持续输出新日志
- 无 500/503 错误

### 失败判定

- 返回空数组或错误
- RPC 调用超时或连接失败

### 失败时替代方案

- 使用 `openclaw logs` CLI（底层调用同一 API）
- 查看 gateway 日志文件：`~/.openclaw/logs/openclaw-YYYY-MM-DD.log`
- 使用 system logs 命令

### 预估耗时

- 10-15 分钟

---

## 2. agents.restart 权限边界

### 验证方法

**步骤：**
1. 检查当前 API 列表：
   ```bash
   # 查看 gateway 注册的 API
   grep -r "agents\." /path/to/gateway-cli.js | grep '"agents'
   ```
2. 尝试调用 agents.restart（预期失败）：
   ```json
   { "method": "agents.restart", "params": { "agentId": "test-agent" } }
   ```
3. 检查现有 agents API 权限：
   - agents.list - 无 scope 要求
   - agents.create/update/delete - 需对应权限

### 成功判定

- 确认 agents.restart API 不存在
- 确认需要新增该 API 或使用替代方案

### 失败判定

- API 已存在（版本差异）

### 失败时替代方案

- 使用配置热加载触发 agent 重启：
  ```bash
  # 修改配置后触发 reload
  openclaw gateway reload
  ```
- 使用 SIGUSR1 触发 gateway 级别重启
- 通过 channel 的 restart-channel action

### 预估耗时

- 15-20 分钟

---

## 3. openclaw.json 配置热加载机制

### 验证方法

**步骤：**
1. 检查当前 reload 模式：
   ```bash
   openclaw gateway status
   # 或查看 openclaw.json 中 gateway.reload.mode
   ```
2. 测试 hot reload 生效的配置（如 hooks）：
   ```bash
   # 1. 查看当前 hooks 配置
   openclaw hooks status
   
   # 2. 修改 openclaw.json 中的 hooks 配置
   # 添加/修改一个 hook
   vim ~/.openclaw/openclaw.json
   
   # 3. 观察 gateway 是否自动重载（查看日志）
   openclaw logs tail --follow
   ```
3. 测试需要 restart 的配置（如 agents）：
   ```bash
   # 1. 修改 agents.list
   # 2. 观察是否需要手动重启
   openclaw gateway restart
   ```

### 成功判定

- hot reload 生效：hooks/cron/heartbeat/browser 配置变更自动应用
- 需要 restart 的配置：agents/models/tools 等变更需重启
- 观察日志中出现 "hot reload" 或 "restart gateway" 相关信息

### 失败判定

- 配置变更无响应
- 热加载失败导致服务异常

### 失败时替代方案

- 手动重启 gateway：
  ```bash
  openclaw gateway restart
  ```
- 使用 SIGUSR1 触发：
  ```bash
  kill -SIGUSR1 $(pgrep -f "openclaw gateway")
  ```

### 预估耗时

- 20-30 分钟

---

## 参考来源

- `gateway-cli-C7FS-lL-.js` 行 7501, 11973-12100（logs.tail 实现）
- `gateway-cli-C7FS-lL-.js` 行 1630-1710（reload 规则）
- `gateway-cli-C7FS-lL-.js` 行 7533-7539（agents API 列表）
- `paths-B9jPXz5d.js` 行 66（配置文件名）

---

## 待确认事项

1. v2 是否计划新增 agents.restart API？当前仅有 list/create/update/delete
2. logs.query 是否为 v2 计划中的新功能？
3. 配置热加载是否满足 v2 需求，还是需要扩展热加载范围？
