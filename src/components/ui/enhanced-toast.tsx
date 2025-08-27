import React from 'react'
import { Toast } from '@/components/ui/toast'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface EnhancedToastProps {
  id?: string
  type?: ToastType
  title?: string
  description?: string
  action?: React.ReactNode
  onClose?: () => void
  persistent?: boolean
  duration?: number
  className?: string
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2
}

const toastStyles = {
  success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
  loading: 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100'
}

const iconStyles = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
  loading: 'text-gray-600 dark:text-gray-400 animate-spin'
}

export const EnhancedToast: React.FC<EnhancedToastProps> = ({
  type = 'info',
  title,
  description,
  action,
  onClose,
  persistent = false,
  className,
  ...props
}) => {
  const Icon = toastIcons[type]

  return (
    <Toast
      className={cn(
        'flex items-start space-x-3 p-4',
        toastStyles[type],
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">
        <Icon className={cn('w-5 h-5', iconStyles[type])} />
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-medium text-sm mb-1">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm opacity-90">
            {description}
          </div>
        )}
        {action && (
          <div className="mt-3">
            {typeof action === 'object' && 'label' in action && 'onClick' in action ? (
              <button 
                onClick={action.onClick}
                className="text-sm underline hover:no-underline"
              >
                {action.label}
              </button>
            ) : (
              action
            )}
          </div>
        )}
      </div>

      {!persistent && onClose && (
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Toast>
  )
}

// Predefined toast variants for common use cases
export const SuccessToast: React.FC<Omit<EnhancedToastProps, 'type'>> = (props) => (
  <EnhancedToast type="success" {...props} />
)

export const ErrorToast: React.FC<Omit<EnhancedToastProps, 'type'>> = (props) => (
  <EnhancedToast type="error" {...props} />
)

export const WarningToast: React.FC<Omit<EnhancedToastProps, 'type'>> = (props) => (
  <EnhancedToast type="warning" {...props} />
)

export const InfoToast: React.FC<Omit<EnhancedToastProps, 'type'>> = (props) => (
  <EnhancedToast type="info" {...props} />
)

export const LoadingToast: React.FC<Omit<EnhancedToastProps, 'type'>> = (props) => (
  <EnhancedToast type="loading" persistent {...props} />
)