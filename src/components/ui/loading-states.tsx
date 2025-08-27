import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

interface FullPageLoadingProps {
  title?: string
  subtitle?: string
  className?: string
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  title = 'Loading...',
  subtitle = 'Please wait while we prepare your data',
  className
}) => (
  <div className={cn(
    'min-h-screen flex items-center justify-center bg-background',
    className
  )}>
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </div>
)

interface InlineLoadingProps {
  text?: string
  size?: 'sm' | 'md'
  className?: string
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = 'Loading...',
  size = 'sm',
  className
}) => (
  <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
    <Loader2 className={cn('animate-spin', size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')} />
    <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{text}</span>
  </div>
)

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className
}) => (
  <div className={cn('text-center py-12 px-4', className)}>
    {icon && (
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-foreground mb-2">
      {title}
    </h3>
    {description && (
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {description}
      </p>
    )}
    {action}
  </div>
)

interface NetworkStatusProps {
  isOnline?: boolean
  onRetry?: () => void
  className?: string
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  isOnline = navigator.onLine,
  onRetry,
  className
}) => {
  if (isOnline) return null

  return (
    <Card className={cn('border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950', className)}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-900 dark:text-yellow-100">
              You're offline
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              Check your internet connection and try again
            </p>
          </div>
        </div>
        {onRetry && (
          <Button 
            onClick={onRetry} 
            variant="outline" 
            size="sm"
            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900"
          >
            <Wifi className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface LoadingButtonProps {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
  className?: string
  [key: string]: any
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText = 'Loading...',
  children,
  className,
  disabled,
  ...props
}) => (
  <Button
    disabled={disabled || loading}
    className={className}
    {...props}
  >
    {loading ? (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        {loadingText}
      </>
    ) : (
      children
    )}
  </Button>
)

interface ProgressIndicatorProps {
  steps: string[]
  currentStep: number
  className?: string
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  className
}) => (
  <div className={cn('space-y-4', className)}>
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div
          key={step}
          className={cn(
            'flex items-center gap-2',
            index <= currentStep ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              index < currentStep 
                ? 'bg-primary text-primary-foreground'
                : index === currentStep
                ? 'bg-primary/20 text-primary border-2 border-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {index < currentStep ? '✓' : index + 1}
          </div>
          <span className="text-sm font-medium">{step}</span>
        </div>
      ))}
    </div>
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />
    </div>
  </div>
)