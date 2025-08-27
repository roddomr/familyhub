import { useState, useEffect } from 'react'
import { useEnhancedToast } from './useEnhancedToast'
import { useLogger } from './useLogger'

export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  })

  const [wasOffline, setWasOffline] = useState(false)
  const { success, warning, error } = useEnhancedToast()
  const { logInfo, logError } = useLogger()

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection

      const isOnline = navigator.onLine
      const previouslyOnline = networkStatus.isOnline

      let isSlowConnection = false
      let effectiveType = 'unknown'
      let downlink = 0
      let rtt = 0
      let saveData = false

      if (connection) {
        effectiveType = connection.effectiveType || 'unknown'
        downlink = connection.downlink || 0
        rtt = connection.rtt || 0
        saveData = connection.saveData || false
        
        // Consider 2g and slow-2g as slow connections
        isSlowConnection = ['slow-2g', '2g'].includes(effectiveType) || 
                          downlink < 0.5 || 
                          rtt > 500
      }

      setNetworkStatus({
        isOnline,
        isSlowConnection,
        effectiveType,
        downlink,
        rtt,
        saveData
      })

      // Handle connectivity changes
      if (!previouslyOnline && isOnline && wasOffline) {
        // Just came back online
        success({
          title: 'Back online!',
          description: 'Your connection has been restored.'
        })
        logInfo('Network connection restored', { 
          effectiveType, 
          downlink, 
          rtt 
        }, 'frontend', 'network')
        setWasOffline(false)
      } else if (previouslyOnline && !isOnline) {
        // Just went offline
        error({
          title: 'Connection lost',
          description: 'You are currently offline. Some features may not work.',
          persistent: true
        })
        logError('Network connection lost', {}, 'frontend', 'network', 'OFFLINE')
        setWasOffline(true)
      }

      // Warn about slow connections
      if (isOnline && isSlowConnection && !networkStatus.isSlowConnection) {
        warning({
          title: 'Slow connection detected',
          description: 'Some features may take longer to load.',
          duration: 5000
        })
        logInfo('Slow network connection detected', {
          effectiveType,
          downlink,
          rtt
        }, 'frontend', 'network')
      }
    }

    // Initial check
    updateNetworkStatus()

    // Listen for online/offline events
    const handleOnline = () => updateNetworkStatus()
    const handleOffline = () => updateNetworkStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection

    if (connection) {
      connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [networkStatus.isOnline, wasOffline, success, warning, error, logInfo, logError])

  // Retry mechanism for failed requests
  const retryWithBackoff = async <T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check if we're online before attempting
        if (!networkStatus.isOnline) {
          throw new Error('Device is offline')
        }

        return await operation()
      } catch (err) {
        lastError = err as Error
        
        // Don't retry on certain error types
        if (
          err instanceof Error && (
            err.message.includes('401') ||
            err.message.includes('403') ||
            err.message.includes('404') ||
            attempt === maxAttempts
          )
        ) {
          break
        }

        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        logInfo(`Retrying operation, attempt ${attempt + 1}/${maxAttempts}`, {
          delay,
          error: lastError.message
        }, 'frontend', 'network_retry')
      }
    }

    throw lastError!
  }

  // Check if we should show offline UI
  const shouldShowOfflineUI = !networkStatus.isOnline

  // Check if we should optimize for slow connections
  const shouldOptimizeForSlowConnection = networkStatus.isSlowConnection || networkStatus.saveData

  return {
    ...networkStatus,
    shouldShowOfflineUI,
    shouldOptimizeForSlowConnection,
    retryWithBackoff
  }
}

// Hook for handling offline-first data
export const useOfflineFirst = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    staleTime?: number
    retryOnReconnect?: boolean
  } = {}
) => {
  const { staleTime = 5 * 60 * 1000, retryOnReconnect = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const { isOnline, retryWithBackoff } = useNetworkStatus()

  const fetchData = async (force = false) => {
    try {
      setLoading(true)
      setError(null)

      // Check if we have cached data that's still fresh
      if (!force && data && lastUpdated) {
        const age = Date.now() - lastUpdated.getTime()
        if (age < staleTime) {
          setLoading(false)
          return data
        }
      }

      // Try to fetch fresh data
      const result = await retryWithBackoff(fetchFn)
      setData(result)
      setLastUpdated(new Date())
      
      // Cache in localStorage for offline access
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }))
      }
      
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      
      // Try to load from cache if offline
      if (!isOnline && typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(key)
        if (cached) {
          try {
            const { data: cachedData, timestamp } = JSON.parse(cached)
            setData(cachedData)
            setLastUpdated(new Date(timestamp))
            return cachedData
          } catch (parseError) {
            console.warn('Failed to parse cached data:', parseError)
          }
        }
      }
      
      throw error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Retry when coming back online
  useEffect(() => {
    if (isOnline && retryOnReconnect && error) {
      fetchData()
    }
  }, [isOnline, retryOnReconnect, error])

  const isStale = lastUpdated && (Date.now() - lastUpdated.getTime()) > staleTime

  return {
    data,
    loading,
    error,
    lastUpdated,
    isStale,
    refetch: () => fetchData(true)
  }
}