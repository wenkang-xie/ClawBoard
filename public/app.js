const app = document.querySelector('#app');

const ENV_LABEL = {
  all: 'All',
  prod: 'Prod',
  staging: 'Staging',
  dev: 'Dev',
};

const DEMO_LABEL = {
  normal: '正常',
  loading: 'Loading',
  empty: 'Empty',
  error: 'Error',
};

const state = {
  route: parseRoute(location.pathname),
  selectedGatewayId: '',
  allGateways: [],
  envFilter: 'all',
  search: '',
  demoMode: 'normal',
  fleetLoading: false,
  fleetError: '',
  fleetItems: [],
  fleetMeta: { p0: 0, p1: 0, updatedAt: '-' },
  contextVersion: 1,
  contextToast: '',
  contextSwitching: false,
  lastContextChangedAt: '-',
};

let fleetRequestId = 0;
let fleetAbortController = null;
let searchDebounce = null;
let toastTimer = null;

function parseRoute(pathname) {
  if (!pathname || pathname === '/' || pathname === '/fleet') {
    return { name: 'fleet' };
  }

  const configMatch = pathname.match(/^\/gateway\/([^/]+)\/configs$/);
  if (configMatch) {
    return { name: 'configs', gatewayId: decodeURIComponent(configMatch[1]) };
  }

  if (pathname === '/configs') {
    return { name: 'configs' };
  }

  return { name: 'not-found' };
}

function formatTime(iso) {
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function currentGateway() {
  return state.allGateways.find(g => g.id === state.selectedGatewayId) || state.allGateways[0] || null;
}

function navigate(path, replace = false) {
  if (replace) {
    history.replaceState({}, '', path);
  } else {
    history.pushState({}, '', path);
  }

  state.route = parseRoute(path);
  if (state.route.name === 'configs' && state.route.gatewayId) {
    if (state.route.gatewayId !== state.selectedGatewayId) {
      state.selectedGatewayId = state.route.gatewayId;
      markContextChanged(null, currentGateway());
    }
  }

  render();
  if (state.route.name === 'fleet') {
    loadFleet();
  }
}

function markContextChanged(prevGateway, nextGateway) {
  state.contextVersion += 1;
  state.contextSwitching = true;
  state.lastContextChangedAt = new Date().toISOString();

  if (prevGateway && nextGateway && prevGateway.id !== nextGateway.id) {
    state.contextToast = `上下文已切换：${prevGateway.name} → ${nextGateway.name}`;
  } else if (nextGateway) {
    state.contextToast = `上下文更新：${nextGateway.name}`;
  }

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.contextSwitching = false;
    state.contextToast = '';
    render();
  }, 1200);
}

async function loadGatewayOptions() {
  try {
    const res = await fetch('/api/gateways?env=all&state=normal');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '加载 Gateway 失败');

    state.allGateways = Array.isArray(data.items) ? data.items : [];

    if (!state.selectedGatewayId && state.allGateways.length > 0) {
      state.selectedGatewayId = state.allGateways[0].id;
      state.lastContextChangedAt = new Date().toISOString();
    }

    if (state.route.name === 'configs' && state.route.gatewayId) {
      state.selectedGatewayId = state.route.gatewayId;
    }
  } catch {
    state.allGateways = [];
  }
}

async function loadFleet() {
  if (fleetAbortController) {
    fleetAbortController.abort();
  }

  const requestId = ++fleetRequestId;
  fleetAbortController = new AbortController();

  state.fleetLoading = true;
  state.fleetError = '';
  render();

  const params = new URLSearchParams({
    env: state.envFilter,
    search: state.search.trim(),
    state: state.demoMode,
  });

  try {
    const res = await fetch(`/api/gateways?${params.toString()}`, {
      signal: fleetAbortController.signal,
    });
    const data = await res.json();

    if (requestId !== fleetRequestId) return;
    if (!res.ok) throw new Error(data.error || '网关列表请求失败');

    state.fleetItems = Array.isArray(data.items) ? data.items : [];
    state.fleetMeta = data.meta || { p0: 0, p1: 0, updatedAt: '-' };
    state.fleetError = '';
  } catch (err) {
    if (fleetAbortController.signal.aborted) return;
    if (requestId !== fleetRequestId) return;

    state.fleetItems = [];
    state.fleetError = err instanceof Error ? err.message : '未知错误';
  } finally {
    if (requestId === fleetRequestId) {
      state.fleetLoading = false;
      render();
    }
  }
}

function switchGateway(nextId, opts = { syncRoute: true }) {
  const nextGateway = state.allGateways.find(g => g.id === nextId);
  if (!nextGateway) return;

  const prevGateway = currentGateway();
  if (prevGateway?.id === nextGateway.id) return;

  state.selectedGatewayId = nextGateway.id;
  markContextChanged(prevGateway, nextGateway);

  if (opts.syncRoute && state.route.name === 'configs') {
    navigate(`/gateway/${encodeURIComponent(nextGateway.id)}/configs`, true);
    return;
  }

  render();
}

function renderEnvTabs() {
  return ['all', 'prod', 'staging', 'dev']
    .map(env => {
      const active = state.envFilter === env ? 'active' : '';
      return `<button class="env-tab ${active}" data-action="env-filter" data-env="${env}">${ENV_LABEL[env]}</button>`;
    })
    .join('');
}

function renderFleetCards() {
  return state.fleetItems
    .map(gateway => {
      const active = gateway.id === state.selectedGatewayId ? 'active' : '';
      const heartbeat = formatTime(gateway.lastHeartbeatAt);

      return `
        <button class="gateway-card ${active}" data-action="select-gateway" data-id="${gateway.id}">
          <div class="gateway-head">
            <div>
              <h3 class="gateway-name">${escapeHtml(gateway.name)}</h3>
              <p class="gateway-meta">${escapeHtml(gateway.id)} · ${escapeHtml(gateway.region)}</p>
            </div>
            <span class="context-pill env">${escapeHtml(gateway.env)}</span>
          </div>
          <div class="gateway-meta"><span class="status-dot ${escapeHtml(gateway.health)}"></span> ${escapeHtml(gateway.healthLabel)} · 心跳 ${heartbeat}</div>
          <div class="gateway-stats">
            <div class="stat"><div class="label">在线 Agent</div><div class="value">${gateway.agentCount}</div></div>
            <div class="stat"><div class="label">错误率</div><div class="value">${gateway.errorRate}%</div></div>
            <div class="stat"><div class="label">最近变更</div><div class="value">${escapeHtml(gateway.recentChange)}</div></div>
            <div class="stat"><div class="label">待处理告警</div><div class="value">${gateway.pendingAlerts}</div></div>
          </div>
        </button>
      `;
    })
    .join('');
}

function renderLoadingSkeleton() {
  return `
    <div class="skeleton-grid">
      ${Array.from({ length: 6 })
        .map(
          () => `
            <div class="skeleton-card">
              <div class="skeleton-line" style="width: 56%"></div>
              <div class="skeleton-line" style="width: 82%"></div>
              <div class="skeleton-line" style="width: 46%"></div>
              <div class="skeleton-line" style="width: 92%"></div>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderFleetPage() {
  let body = '';

  if (state.fleetLoading) {
    body = renderLoadingSkeleton();
  } else if (state.fleetError) {
    body = `
      <div class="state-box error">
        <div>请求失败：${escapeHtml(state.fleetError)}</div>
        <button class="btn" data-action="retry-fleet">重试</button>
      </div>
    `;
  } else if (!state.fleetItems.length) {
    body = `
      <div class="state-box">
        <div>当前筛选下暂无 Gateway</div>
        <button class="btn" data-action="reset-filters">清空筛选</button>
      </div>
    `;
  } else {
    body = `<div class="gateway-grid">${renderFleetCards()}</div>`;
  }

  return `
    <section class="panel">
      <div class="page-head">
        <div>
          <h1 class="page-title">/fleet 页面骨架（M1）</h1>
          <p class="page-desc">环境过滤 + Gateway 卡片矩阵占位，支持上下文切换演示。</p>
        </div>
        <div class="risk-summary">
          <span class="badge danger">P0 ${state.fleetMeta.p0 || 0}</span>
          <span class="badge warn">P1 ${state.fleetMeta.p1 || 0}</span>
          <span class="badge">更新于 ${escapeHtml(state.fleetMeta.updatedAt || '-')}</span>
        </div>
      </div>

      <div class="fleet-tools">
        <div class="env-tabs">${renderEnvTabs()}</div>
        <input id="fleetSearch" class="search-input" value="${escapeHtml(state.search)}" placeholder="搜索 Gateway 名称/别名" />
      </div>
    </section>

    <section class="panel">
      ${body}
    </section>
  `;
}

function renderConfigLoading() {
  return `
    <section class="panel">
      ${renderLoadingSkeleton()}
    </section>
  `;
}

function renderConfigPage() {
  if (state.demoMode === 'loading') {
    return renderConfigLoading();
  }

  if (state.demoMode === 'error') {
    return `
      <section class="panel">
        <div class="state-box error">
          <div>配置中心加载失败：模拟网关不可达</div>
          <button class="btn" data-action="demo-normal">切回正常态</button>
        </div>
      </section>
    `;
  }

  if (state.demoMode === 'empty') {
    return `
      <section class="panel">
        <div class="state-box">
          <div>配置模块为空（M1 空态）</div>
          <div style="margin-top: 6px">请先选择网关或取消过滤条件。</div>
        </div>
      </section>
    `;
  }

  const gateway = currentGateway();
  if (!gateway) {
    return `
      <section class="panel">
        <div class="state-box">暂无 Gateway，上下文选择器为空。</div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="page-head">
        <div>
          <h1 class="page-title">配置中心骨架（只读）</h1>
          <p class="page-desc">网关：${escapeHtml(gateway.name)} · ${escapeHtml(gateway.region)} · ${escapeHtml(gateway.env.toUpperCase())}</p>
        </div>
      </div>

      <div class="readonly-banner">
        🔒 ReadOnly Mode（M1）：高风险按钮暂不开放，所有写入路径仅保留占位与说明。
      </div>

      <div class="config-layout">
        <div class="config-col">
          <h3>模块树（只读）</h3>
          <div class="module-item active"><span>gateway.core</span><span>v18</span></div>
          <div class="module-item"><span>session.guard</span><span>v7</span></div>
          <div class="module-item"><span>route.policy</span><span>v14</span></div>
          <div class="module-item"><span>metric.pipeline</span><span>v22</span></div>
        </div>

        <div class="config-col">
          <h3>编辑区（JSON/Form 占位）</h3>
          <div class="skeleton-line" style="width: 38%"></div>
          <div class="skeleton-line" style="width: 86%"></div>
          <div class="skeleton-line" style="width: 91%"></div>
          <div class="skeleton-line" style="width: 73%"></div>
          <div class="skeleton-line" style="width: 82%"></div>
          <div class="skeleton-line" style="width: 66%"></div>
        </div>

        <div class="config-col">
          <h3>影响分析（占位）</h3>
          <div class="impact-card">影响组件：agent-session, gateway-router</div>
          <div class="impact-card">依赖健康：2 healthy / 1 degraded</div>
          <div class="impact-card">风险等级：P1（预估）</div>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-group">
          <button class="btn" disabled>保存草稿（M2）</button>
          <button class="btn" disabled>查看 Diff（M2）</button>
          <button class="btn" disabled>Apply 到 Gateway（M2）</button>
        </div>
        <div class="action-note">上下文版本 v${state.contextVersion} · 最近切换 ${formatTime(state.lastContextChangedAt)} · 危险动作已重置为禁用</div>
      </div>
    </section>
  `;
}

function renderNotFound() {
  return `
    <section class="panel">
      <div class="state-box">
        <div>页面不存在</div>
        <button class="btn" data-action="go-fleet">返回 /fleet</button>
      </div>
    </section>
  `;
}

function render() {
  const gateway = currentGateway();
  const envClass = gateway ? `env-${gateway.env}` : 'env-all';
  const isFleet = state.route.name === 'fleet';
  const isConfigs = state.route.name === 'configs';

  const contextPills = gateway
    ? `
      <span class="context-pill">Gateway: <strong>${escapeHtml(gateway.name)}</strong></span>
      <span class="context-pill env">${escapeHtml(gateway.env)}</span>
      <span class="context-pill">Region: ${escapeHtml(gateway.region)}</span>
      <span class="context-pill"><span class="status-dot ${escapeHtml(gateway.health)}"></span> ${escapeHtml(gateway.healthLabel)}</span>
      <span class="context-pill">Context v${state.contextVersion}</span>
    `
    : '<span class="context-pill">无可用 Gateway</span>';

  const content = isFleet ? renderFleetPage() : isConfigs ? renderConfigPage() : renderNotFound();

  app.innerHTML = `
    <div class="app ${envClass}">
      <header class="context-strip ${state.contextSwitching ? 'switching' : ''}">
        <div class="context-main">
          <div class="context-left">
            <span class="logo">Agent Board v2 · M1</span>
            <select id="gatewaySelect" class="context-select">
              ${state.allGateways
                .map(g => `<option value="${g.id}" ${g.id === state.selectedGatewayId ? 'selected' : ''}>${escapeHtml(g.name)} · ${escapeHtml(g.env)} · ${escapeHtml(g.region)}</option>`)
                .join('')}
            </select>
            ${contextPills}
          </div>
          <div class="context-right">
            ${state.contextToast ? `<span class="toast">${escapeHtml(state.contextToast)}</span>` : ''}
          </div>
        </div>

        <div class="top-nav">
          <nav class="nav-links">
            <a class="nav-link ${isFleet ? 'active' : ''}" href="/fleet" data-action="nav-fleet">/fleet</a>
            <a class="nav-link ${isConfigs ? 'active' : ''}" href="/gateway/${encodeURIComponent(state.selectedGatewayId || 'none')}/configs" data-action="nav-configs">配置中心</a>
          </nav>

          <label class="demo-state">
            状态演示
            <select id="demoStateSelect">
              ${Object.entries(DEMO_LABEL)
                .map(([k, label]) => `<option value="${k}" ${k === state.demoMode ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
          </label>
        </div>
      </header>

      <main>
        ${content}
      </main>
    </div>
  `;
}

function bindEvents() {
  document.addEventListener('click', event => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    if (action === 'nav-fleet') {
      event.preventDefault();
      navigate('/fleet');
      return;
    }

    if (action === 'nav-configs') {
      event.preventDefault();
      if (!state.selectedGatewayId) return;
      navigate(`/gateway/${encodeURIComponent(state.selectedGatewayId)}/configs`);
      return;
    }

    if (action === 'env-filter') {
      state.envFilter = actionEl.dataset.env || 'all';
      loadFleet();
      return;
    }

    if (action === 'select-gateway') {
      switchGateway(actionEl.dataset.id || '');
      return;
    }

    if (action === 'retry-fleet') {
      loadFleet();
      return;
    }

    if (action === 'reset-filters') {
      state.envFilter = 'all';
      state.search = '';
      loadFleet();
      return;
    }

    if (action === 'go-fleet') {
      navigate('/fleet');
      return;
    }

    if (action === 'demo-normal') {
      state.demoMode = 'normal';
      render();
      if (state.route.name === 'fleet') loadFleet();
    }
  });

  document.addEventListener('change', event => {
    const target = event.target;

    if (target.id === 'gatewaySelect') {
      switchGateway(target.value);
      return;
    }

    if (target.id === 'demoStateSelect') {
      state.demoMode = target.value;
      if (state.route.name === 'fleet') {
        loadFleet();
      } else {
        render();
      }
    }
  });

  document.addEventListener('input', event => {
    const target = event.target;
    if (target.id !== 'fleetSearch') return;

    state.search = target.value;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      loadFleet();
    }, 220);
  });

  window.addEventListener('popstate', () => {
    state.route = parseRoute(location.pathname);

    if (state.route.name === 'configs' && state.route.gatewayId) {
      state.selectedGatewayId = state.route.gatewayId;
      markContextChanged(null, currentGateway());
    }

    render();
    if (state.route.name === 'fleet') loadFleet();
  });
}

async function boot() {
  bindEvents();
  await loadGatewayOptions();

  if (state.route.name === 'configs' && state.route.gatewayId) {
    state.selectedGatewayId = state.route.gatewayId;
  }

  if (!state.selectedGatewayId && state.allGateways.length > 0) {
    state.selectedGatewayId = state.allGateways[0].id;
  }

  if (location.pathname === '/') {
    navigate('/fleet', true);
    return;
  }

  render();
  if (state.route.name === 'fleet') {
    loadFleet();
  }
}

boot();
