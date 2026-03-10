import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { GatewayProvider } from './hooks/useGateway'
import { ThemeProvider } from './hooks/useTheme'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { AgentsPage } from './pages/AgentsPage'
import { SessionsPage } from './pages/SessionsPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { TasksPage } from './pages/TasksPage'
import { MemoryPage } from './pages/MemoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage, checkSetupRequired } from './pages/SetupPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// 应用路由 - 使用 AppLayout 作为父路由
function AppRoutes() {
  const location = useLocation()
  
  return (
    <Routes location={location}>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/:sessionKey" element={<SessionDetailPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

// 根路由 - 检测是否需要显示引导页
function RootRouter() {
  const [showSetup, setShowSetup] = useState<boolean | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // 首次加载时检测配置状态
    if (!initialized) {
      const required = checkSetupRequired()
      setShowSetup(required)
      setInitialized(true)
    }
  }, [initialized])

  // 加载中
  if (!initialized || showSetup === null) {
    return null
  }

  // 需要显示引导页
  if (showSetup) {
    return <SetupPage />
  }

  // 正常渲染应用
  return <AppRoutes />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <GatewayProvider>
          <BrowserRouter>
            <Routes>
              {/* 引导页独立路由 */}
              <Route path="/setup" element={<SetupPage />} />
              
              {/* 主应用路由 */}
              <Route path="/*" element={<RootRouter />} />
            </Routes>
          </BrowserRouter>
        </GatewayProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
