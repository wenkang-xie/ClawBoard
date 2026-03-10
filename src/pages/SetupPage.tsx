import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineCog, HiOutlineDesktopComputer, HiOutlineFolder, HiOutlineCheck, HiOutlineDownload, HiOutlinePlay } from 'react-icons/hi'

interface SetupData {
  gatewayUrl: string
  bffPort: string
  openclawHome: string
}

const DEFAULT_SETUP: SetupData = {
  gatewayUrl: 'ws://localhost:18789',
  bffPort: '18902',
  openclawHome: '~/.openclaw',
}

const STORAGE_KEY = 'agent-dashboard-setup-complete'

export function SetupPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<SetupData>(DEFAULT_SETUP)
  const [step, setStep] = useState(1)
  const [showResult, setShowResult] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const generateEnvContent = () => {
    // 展开 ~ 为实际用户目录
    const homeDir = formData.openclawHome.replace(/^~/, '/Users/wenkang')
    return `# Agent Dashboard Configuration
# 由引导流程生成

# ─────────────────────────────────────────────
# BFF Server Configuration
# ─────────────────────────────────────────────

BFF_PORT=${formData.bffPort}
BFF_HOST=127.0.0.1
VITE_BFF_BASE=http://127.0.0.1:${formData.bffPort}

# ─────────────────────────────────────────────
# OpenClaw/Gateway Configuration
# ─────────────────────────────────────────────

VITE_GATEWAY_WS_URL=${formData.gatewayUrl}

# ─────────────────────────────────────────────
# File System Paths
# ─────────────────────────────────────────────

OPENCLAW_HOME=${formData.openclawHome}
`
  }

  const downloadEnvFile = () => {
    const content = generateEnvContent()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '.env'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const markComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setShowResult(true)
  }

  const goToApp = () => {
    navigate('/')
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <HiOutlineCheck className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">配置完成！</h1>
          <p className="text-gray-400 mb-6">
            环境变量已生成，现在可以启动服务了
          </p>
          
          <div className="bg-gray-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-gray-500 mb-2">启动命令：</p>
            <code className="text-sm text-primary-400 font-mono block">
              npm run bff &amp; npm run dev
            </code>
          </div>

          <button
            onClick={goToApp}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            进入 Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HiOutlineCog className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">欢迎使用 Agent Dashboard</h1>
          <p className="text-gray-500 mt-2">首次使用需要简单配置</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-gray-700'}`} />
          <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary-500' : 'bg-gray-700'}`} />
          <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-gray-700'}`} />
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Gateway URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <HiOutlineDesktopComputer className="w-4 h-4 text-gray-500" />
                  OpenClaw Gateway 地址
                </label>
                <input
                  type="text"
                  value={formData.gatewayUrl}
                  onChange={e => setFormData(f => ({ ...f, gatewayUrl: e.target.value }))}
                  className="w-full bg-gray-800 text-gray-200 rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-primary-500 font-mono text-sm"
                  placeholder="ws://localhost:18789"
                />
                <p className="text-xs text-gray-600 mt-1">本地开发通常使用 ws://localhost:18789</p>
              </div>

              {/* BFF Port */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <HiOutlineCog className="w-4 h-4 text-gray-500" />
                  BFF 服务端口
                </label>
                <input
                  type="text"
                  value={formData.bffPort}
                  onChange={e => setFormData(f => ({ ...f, bffPort: e.target.value }))}
                  className="w-full bg-gray-800 text-gray-200 rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-primary-500 font-mono text-sm"
                  placeholder="18902"
                />
                <p className="text-xs text-gray-600 mt-1">BFF 服务监听端口，前端通过此端口调用 API</p>
              </div>

              {/* OpenClaw Home */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <HiOutlineFolder className="w-4 h-4 text-gray-500" />
                  OpenClaw Home 目录
                </label>
                <input
                  type="text"
                  value={formData.openclawHome}
                  onChange={e => setFormData(f => ({ ...f, openclawHome: e.target.value }))}
                  className="w-full bg-gray-800 text-gray-200 rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-primary-500 font-mono text-sm"
                  placeholder="~/.openclaw"
                />
                <p className="text-xs text-gray-600 mt-1">OpenClaw 的工作目录，包含配置、任务和记忆数据</p>
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                生成配置
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">配置预览</h3>
                <pre className="bg-gray-800 text-gray-300 rounded-lg p-4 text-xs font-mono overflow-x-auto">
                  {generateEnvContent()}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadEnvFile}
                  className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium py-3 px-4 rounded-xl transition-colors border border-gray-700"
                >
                  <HiOutlineDownload className="w-5 h-5" />
                  下载 .env
                </button>
                <button
                  onClick={markComplete}
                  className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                >
                  <HiOutlinePlay className="w-5 h-5" />
                  我已配置
                </button>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  ⚠️ 请将下载的 .env 文件放到项目根目录，然后运行：
                </p>
                <code className="text-xs text-yellow-300 font-mono block mt-2">
                  npm run bff &amp;&amp; npm run dev
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Skip hint */}
        {step === 1 && (
          <p className="text-center text-gray-600 text-sm mt-6">
            如果已有配置，可以直接{' '}
            <button 
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, 'true')
                navigate('/')
              }}
              className="text-primary-400 hover:text-primary-300"
            >
              跳过设置
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

// 检测是否需要显示引导页
export function checkSetupRequired(): boolean {
  // 始终显示引导页，直到用户明确完成设置
  // 用户点击"我已配置"或"跳过设置"后，会将 STORAGE_KEY 设置为 'true'
  // 这样下次访问时就不会显示引导页
  const isSetupComplete = localStorage.getItem(STORAGE_KEY) === 'true'
  if (isSetupComplete) {
    return false
  }
  
  // 默认显示引导页，让用户配置
  return true
}
