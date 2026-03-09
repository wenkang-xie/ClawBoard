interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
}

export function EmptyState({ icon = '📭', title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="text-gray-400 font-medium">{title}</p>
      {description && <p className="text-sm text-gray-600">{description}</p>}
    </div>
  )
}
