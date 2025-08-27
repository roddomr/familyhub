import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react'
import { useLogger } from '@/hooks/useLogger'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    
    // Log error to our logging system
    this.props.onError?.(error, errorInfo)
    
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} resetError={() => this.resetError()} />
    }

    return this.props.children
  }

  private resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }
}

// Error fallback component
const ErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => {
  const { logError } = useLogger()

  React.useEffect(() => {
    if (error) {
      logError(
        'React Error Boundary triggered',
        {
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: error.cause,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        'frontend',
        'error_boundary',
        'REACT_ERROR_BOUNDARY'
      )
    }
  }, [error, logError])

  const isDevelopment = process.env.NODE_ENV === 'development'

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleReportError = () => {
    // Could integrate with error reporting service like Sentry
    const errorReport = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }
    
    console.log('Error report prepared:', errorReport)
    // In production, send to error reporting service
    // await reportError(errorReport)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Oops! Something went wrong
          </CardTitle>
          <CardDescription>
            We encountered an unexpected error. Don't worry, your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && error && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium text-destructive mb-2">Error Details (Development):</p>
              <p className="text-muted-foreground break-words">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button onClick={resetError} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <div className="flex gap-2">
              <Button onClick={handleGoHome} variant="outline" className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
              <Button onClick={handleRefresh} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
            
            <Button 
              onClick={handleReportError} 
              variant="ghost" 
              size="sm"
              className="text-xs"
            >
              <Bug className="w-3 h-3 mr-2" />
              Report this error
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            If this problem persists, please contact support.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// HOC wrapper to use hooks
export const ErrorBoundary: React.FC<Props> = (props) => {
  const { logError } = useLogger()

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    logError(
      `React Error Boundary: ${error.message}`,
      {
        error: error.message,
        stack: error.stack,
        errorInfo: errorInfo.componentStack,
        props: Object.keys(errorInfo),
        timestamp: new Date().toISOString(),
      },
      'frontend',
      'error_boundary',
      'REACT_ERROR'
    )
  }

  return <ErrorBoundaryClass {...props} onError={handleError} />
}