interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  }[size]

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8">
      <div className={`${sizeClass} border-gray-600 border-t-indigo-400 rounded-full animate-spin`} />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  )
}
