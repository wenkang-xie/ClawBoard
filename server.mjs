import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 18901);

const GATEWAYS = [
  {
    id: 'gw-prod-cn-sh-01',
    name: 'Shanghai Prod Gateway',
    alias: 'prod-sh-main',
    env: 'prod',
    region: 'cn-sh',
    health: 'healthy',
    healthLabel: 'Healthy',
    lastHeartbeatAt: '2026-03-08T06:26:01.000Z',
    latencyMs: 42,
    agentCount: 18,
    errorRate: 0.12,
    recentChange: '12m 前',
    pendingAlerts: 1,
    riskLevel: 'P1',
  },
  {
    id: 'gw-prod-cn-bj-01',
    name: 'Beijing Prod Gateway',
    alias: 'prod-bj-main',
    env: 'prod',
    region: 'cn-bj',
    health: 'degraded',
    healthLabel: 'Degraded',
    lastHeartbeatAt: '2026-03-08T06:25:36.000Z',
    latencyMs: 95,
    agentCount: 15,
    errorRate: 1.43,
    recentChange: '27m 前',
    pendingAlerts: 3,
    riskLevel: 'P0',
  },
  {
    id: 'gw-staging-cn-sh-01',
    name: 'Shanghai Staging Gateway',
    alias: 'staging-sh',
    env: 'staging',
    region: 'cn-sh',
    health: 'healthy',
    healthLabel: 'Healthy',
    lastHeartbeatAt: '2026-03-08T06:26:15.000Z',
    latencyMs: 51,
    agentCount: 8,
    errorRate: 0.38,
    recentChange: '5m 前',
    pendingAlerts: 0,
    riskLevel: 'P2',
  },
  {
    id: 'gw-staging-us-west-01',
    name: 'US West Staging Gateway',
    alias: 'staging-usw',
    env: 'staging',
    region: 'us-west',
    health: 'healthy',
    healthLabel: 'Healthy',
    lastHeartbeatAt: '2026-03-08T06:25:55.000Z',
    latencyMs: 74,
    agentCount: 6,
    errorRate: 0.55,
    recentChange: '41m 前',
    pendingAlerts: 1,
    riskLevel: 'P1',
  },
  {
    id: 'gw-dev-local-01',
    name: 'Local Dev Gateway',
    alias: 'dev-local',
    env: 'dev',
    region: 'local',
    health: 'healthy',
    healthLabel: 'Healthy',
    lastHeartbeatAt: '2026-03-08T06:25:31.000Z',
    latencyMs: 20,
    agentCount: 3,
    errorRate: 0,
    recentChange: '2h 前',
    pendingAlerts: 0,
    riskLevel: 'P3',
  },
  {
    id: 'gw-dev-ci-01',
    name: 'CI Dev Gateway',
    alias: 'dev-ci',
    env: 'dev',
    region: 'cn-hz',
    health: 'down',
    healthLabel: 'Down',
    lastHeartbeatAt: '2026-03-08T05:40:10.000Z',
    latencyMs: 0,
    agentCount: 0,
    errorRate: 5.41,
    recentChange: '3h 前',
    pendingAlerts: 4,
    riskLevel: 'P0',
  },
];

const contentType = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function toLocal(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function listGateways(query) {
  const env = String(query.get('env') || 'all').toLowerCase();
  const search = String(query.get('search') || '').toLowerCase();

  let items = [...GATEWAYS];

  if (env !== 'all') {
    items = items.filter(item => item.env === env);
  }

  if (search) {
    items = items.filter(item => {
      return (
        item.name.toLowerCase().includes(search) ||
        item.alias.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search)
      );
    });
  }

  const p0 = items.filter(item => item.riskLevel === 'P0').length;
  const p1 = items.filter(item => item.riskLevel === 'P1').length;

  return {
    items,
    meta: {
      p0,
      p1,
      updatedAt: toLocal(new Date().toISOString()),
    },
  };
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/gateways') {
    const demoState = String(url.searchParams.get('state') || 'normal').toLowerCase();

    if (demoState === 'loading') {
      await new Promise(resolve => setTimeout(resolve, 1300));
    }

    if (demoState === 'error') {
      sendJson(res, 503, {
        error: 'GATEWAY_UNREACHABLE: mock upstream timeout',
      });
      return true;
    }

    const data = listGateways(url.searchParams);

    if (demoState === 'empty') {
      data.items = [];
      data.meta.p0 = 0;
      data.meta.p1 = 0;
    }

    sendJson(res, 200, data);
    return true;
  }

  if (url.pathname === '/healthz') {
    sendJson(res, 200, {
      ok: true,
      time: new Date().toISOString(),
    });
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  const safePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const normalized = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!normalized.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(normalized);
    const ext = path.extname(normalized);
    res.writeHead(200, {
      'Content-Type': contentType[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
    return;
  } catch {
    const indexFile = path.join(PUBLIC_DIR, 'index.html');
    try {
      const html = await fs.readFile(indexFile);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(html);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') {
    const handled = await handleApi(req, res, url);
    if (!handled) {
      sendJson(res, 404, { error: 'Not Found' });
    }
    return;
  }

  await serveStatic(req, res, url);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`agent-board-m1 running: http://127.0.0.1:${PORT}`);
});
