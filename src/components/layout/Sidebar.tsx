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
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <p className="text-sm font-semibold text-white">Agent Dashboard</p>
            <p className="text-xs text-gray-500">OpenClaw Monitor</p>
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
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600">v0.1.0</p>
      </div>
    </aside>
  )
}
