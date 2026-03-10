import { NavLink } from 'react-router-dom'
import { MdDashboard, MdSmartToy, MdAccountTree, MdMemory, MdTask, MdSettings } from 'react-icons/md'

const navItems = [
  { to: '/', icon: MdDashboard, label: 'Dashboard' },
  { to: '/agents', icon: MdSmartToy, label: 'Agents' },
  { to: '/sessions', icon: MdAccountTree, label: 'Sessions' },
  { to: '/memory', icon: MdMemory, label: 'Memory' },
  { to: '/tasks', icon: MdTask, label: 'Tasks' },
  { to: '/settings', icon: MdSettings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 dark:bg-gray-900 light:bg-white border-r border-gray-800 dark:border-gray-800 light:border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-800 dark:border-gray-800 light:border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <p className="text-sm font-semibold text-white dark:text-white light:text-slate-900">Agent Dashboard</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 light:text-slate-500">OpenClaw Monitor</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary-glow'
                  : 'text-gray-400 dark:text-gray-400 light:text-slate-500 hover:bg-gray-800/80 dark:hover:bg-gray-800/80 light:hover:bg-slate-100 hover:text-gray-200 dark:hover:text-gray-200 light:hover:text-slate-700'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 dark:border-gray-800 light:border-slate-200">
        <p className="text-xs text-gray-600 dark:text-gray-600 light:text-slate-400">v0.1.0</p>
      </div>
    </aside>
  )
}
