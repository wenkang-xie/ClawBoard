interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  variant?: 'default' | 'muted'
}

export function LoadingSpinner({ size = 'md', message, variant = 'default' }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
  }[size]

  const borderColor = variant === 'muted' 
    ? 'border-gray-600 border-t-gray-400' 
    : 'border-primary-500/30 border-t-primary-400'

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div className={`relative ${sizeClass} rounded-full animate-spin`}>
        <div className={`absolute inset-0 rounded-full ${borderColor}`} />
        <div className={`absolute inset-0.5 rounded-full bg-gray-950`} />
        <div className={`absolute inset-0 rounded-full ${borderColor} opacity-70`} />
      </div>
      {message && (
        <p className="text-sm text-gray-400 animate-pulse">{message}</p>
      )}
    </div>
  )
}
