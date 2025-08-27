import { useToast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import { useLogger } from '@/hooks/useLogger'
import { ToastType } from '@/components/ui/enhanced-toast'

export interface ToastOptions {
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
  persistent?: boolean
  logError?: boolean
  errorCode?: string
}

export interface LoadingToastOptions extends Omit<ToastOptions, 'duration' | 'persistent'> {
  onComplete?: () => void
  onError?: (error: Error) => void
}

export const useEnhancedToast = () => {
  const { toast, dismiss } = useToast()
  const { t } = useTranslation()
  const { logError, logInfo } = useLogger()

  const showToast = (
    type: ToastType,
    options: ToastOptions = {}
  ) => {
    const {
      title,
      description,
      action,
      duration,
      persistent = false,
      logError: shouldLogError = type === 'error',
      errorCode
    } = options

    // Log significant events
    if (shouldLogError && type === 'error') {
      logError(
        title || 'Toast error displayed',
        {
          description,
          errorCode,
          timestamp: new Date().toISOString(),
          type: 'toast_error'
        },
        'frontend',
        'toast',
        errorCode
      )
    }

    return toast({
      title,
      description,
      action,
      duration: persistent ? Infinity : duration,
      variant: type === 'error' ? 'destructive' : 'default'
    })
  }

  // Success toast with automatic logging
  const success = (options: ToastOptions) => {
    logInfo(
      'Success action completed',
      {
        title: options.title,
        description: options.description,
        timestamp: new Date().toISOString()
      },
      'frontend',
      'user_feedback'
    )

    return showToast('success', {
      title: options.title || t('common.success'),
      duration: 4000,
      ...options
    })
  }

  // Error toast with enhanced error handling
  const error = (options: ToastOptions) => {
    return showToast('error', {
      title: options.title || t('common.error'),
      description: options.description || t('common.unexpectedError'),
      duration: 6000,
      logError: true,
      ...options
    })
  }

  // Warning toast
  const warning = (options: ToastOptions) => {
    return showToast('warning', {
      title: options.title || t('common.warning'),
      duration: 5000,
      ...options
    })
  }

  // Info toast
  const info = (options: ToastOptions) => {
    return showToast('info', {
      title: options.title || t('common.info'),
      duration: 4000,
      ...options
    })
  }

  // Loading toast with promise handling
  const loading = (
    promise: Promise<any>,
    options: LoadingToastOptions = {}
  ) => {
    const {
      title = t('common.loading'),
      description,
      onComplete,
      onError,
      ...restOptions
    } = options

    const toastId = showToast('loading', {
      title,
      description,
      persistent: true,
      ...restOptions
    })

    promise
      .then((result) => {
        dismiss(toastId.id)
        success({
          title: t('common.success'),
          description: t('common.operationCompleted')
        })
        onComplete?.()
        return result
      })
      .catch((err) => {
        dismiss(toastId.id)
        error({
          title: t('common.error'),
          description: err.message || t('common.unexpectedError'),
          errorCode: err.code || 'UNKNOWN_ERROR'
        })
        onError?.(err)
        throw err // Re-throw to maintain promise chain
      })

    return toastId
  }

  // Network error handler
  const networkError = (err?: Error) => {
    const isOffline = !navigator.onLine
    
    return error({
      title: isOffline ? t('errors.offline') : t('errors.networkError'),
      description: isOffline 
        ? t('errors.checkConnection')
        : err?.message || t('errors.tryAgainLater'),
      errorCode: isOffline ? 'OFFLINE' : 'NETWORK_ERROR'
    })
  }

  // Validation error handler
  const validationError = (fields: string[] = []) => {
    return error({
      title: t('errors.validationError'),
      description: fields.length > 0 
        ? t('errors.fieldsRequired', { fields: fields.join(', ') })
        : t('errors.checkForm'),
      errorCode: 'VALIDATION_ERROR'
    })
  }

  // Authentication error handler
  const authError = (message?: string) => {
    return error({
      title: t('errors.authError'),
      description: message || t('errors.signInRequired'),
      errorCode: 'AUTH_ERROR',
      action: {
        label: t('auth.signIn'),
        onClick: () => window.location.href = '/login'
      }
    })
  }

  // Permission error handler
  const permissionError = (resource?: string) => {
    return error({
      title: t('errors.permissionError'),
      description: resource 
        ? t('errors.noPermissionFor', { resource })
        : t('errors.insufficientPermissions'),
      errorCode: 'PERMISSION_ERROR'
    })
  }

  // Generic API error handler
  const apiError = (err: any, context?: string) => {
    let title = t('errors.apiError')
    let description = t('errors.tryAgainLater')
    let errorCode = 'API_ERROR'

    // Handle Supabase errors
    if (err?.error?.message) {
      description = err.error.message
      errorCode = err.error.code || 'SUPABASE_ERROR'
    } else if (err?.message) {
      description = err.message
      errorCode = err.code || 'UNKNOWN_API_ERROR'
    }

    // Handle common HTTP status codes
    if (err?.status) {
      switch (err.status) {
        case 400:
          title = t('errors.badRequest')
          break
        case 401:
          return authError(description)
        case 403:
          return permissionError()
        case 404:
          title = t('errors.notFound')
          break
        case 429:
          title = t('errors.rateLimitExceeded')
          description = t('errors.tooManyRequests')
          break
        case 500:
          title = t('errors.serverError')
          break
        case 503:
          title = t('errors.serviceUnavailable')
          break
      }
    }

    return error({
      title,
      description,
      errorCode,
      logError: true
    })
  }

  return {
    // Basic toast methods
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    
    // Specialized error handlers
    networkError,
    validationError,
    authError,
    permissionError,
    apiError
  }
}