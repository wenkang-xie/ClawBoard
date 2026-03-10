# Sprint3 MVP: Token Dashboard + Tasks Polling

## Scope

- Only Sprint3 was implemented.
- No Sprint4 expansion and no BFF contract changes were introduced.

## Token Dashboard decisions

- Reused `sessions.usage` as the primary source on the Dashboard page.
- If gateway-level aggregates already exist (`totalTokens`, `totalCost`, `dailyAggregated`, `modelBreakdown`, `agentBreakdown`), the frontend keeps them.
- If an aggregate is missing, the frontend computes a safe fallback from `sessions[].usage`.
- Added a visible range switcher: `7d / 14d / 30d / all`.
- Added three observable dimensions in one card:
  - daily token trend
  - model breakdown
  - agent breakdown
- Added explicit refresh status and last-updated visibility inside the usage card.
- Kept the dark dashboard visual style and gave the usage panel more width on the Dashboard page.

## Tasks polling decisions

- Tasks page now consumes parsed BFF task data from `/api/tasks` instead of reparsing markdown on the client.
- Polling strategy is centralized in `TASKS_POLLING_CONFIG`:
  - `runs`: `10s`
  - `tasks`: `15s`
  - `staleTime`: `8s` for runs, `12s` for tasks
  - degraded hint after `45s` without a successful update
- Retry delay reuse: kept the app-level React Query defaults from `src/App.tsx` (2 retries with exponential backoff), instead of introducing a page-specific retry delay.
- UI status now shows:
  - refreshing
  - last updated
  - degraded state when polling is failing or data is too old

## Verification

- `npm run build`
- Runtime smoke test:
  - `GET /api/runs`
  - `GET /api/tasks`
