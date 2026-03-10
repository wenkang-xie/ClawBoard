interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center bg-gray-900/50 border border-gray-800 rounded-xl">
      <span className="text-5xl mb-1">{icon}</span>
      <p className="text-gray-200 font-medium text-base">{title}</p>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
