import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <GatewayProvider>
          <BrowserRouter>
            <Routes>
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
          </BrowserRouter>
        </GatewayProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
