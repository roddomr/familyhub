import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id?: string;
  user_id?: string;
  level: LogLevel;
  message: string;
  details?: Record<string, any>;
  source?: string;
  module?: string;
  action?: string;
  error_code?: string;
  stack_trace?: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
  created_at?: string;
}

export const useLogger = () => {
  const { user } = useAuth();

  const log = async (entry: Omit<LogEntry, 'user_id'>) => {
    try {
      const logData = {
        user_id: user?.id || null,
        level: entry.level,
        message: entry.message,
        details: entry.details ? JSON.stringify(entry.details) : null,
        source: entry.source || 'frontend',
        module: entry.module || null,
        action: entry.action || null,
        error_code: entry.error_code || null,
        stack_trace: entry.stack_trace || null,
        user_agent: navigator.userAgent,
        session_id: user?.id || null,
      };

      const { error } = await supabase.from('logs').insert(logData);
      
      if (error) {
        console.error('Failed to log to database:', error);
      }
    } catch (error) {
      console.error('Logger error:', error);
    }
  };

  const logError = (
    message: string,
    details?: Record<string, any>,
    module?: string,
    action?: string,
    errorCode?: string,
    stackTrace?: string
  ) => {
    log({
      level: 'error',
      message,
      details,
      module,
      action,
      error_code: errorCode,
      stack_trace: stackTrace,
    });
  };

  const logInfo = (
    message: string,
    details?: Record<string, any>,
    module?: string,
    action?: string
  ) => {
    log({
      level: 'info',
      message,
      details,
      module,
      action,
    });
  };

  const logWarn = (
    message: string,
    details?: Record<string, any>,
    module?: string,
    action?: string
  ) => {
    log({
      level: 'warn',
      message,
      details,
      module,
      action,
    });
  };

  const logDebug = (
    message: string,
    details?: Record<string, any>,
    module?: string,
    action?: string
  ) => {
    log({
      level: 'debug',
      message,
      details,
      module,
      action,
    });
  };

  const getUserLogs = async (limit: number = 50, level?: LogLevel) => {
    try {
      const { data, error } = await supabase.rpc('get_user_logs', {
        p_user_id: user?.id,
        p_limit: limit,
        p_level: level || null,
      });

      if (error) {
        console.error('Failed to fetch user logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user logs:', error);
      return [];
    }
  };

  const getRecentErrors = async () => {
    try {
      const { data, error } = await supabase
        .from('recent_errors')
        .select('*')
        .limit(20);

      if (error) {
        console.error('Failed to fetch recent errors:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent errors:', error);
      return [];
    }
  };

  return {
    log,
    logError,
    logInfo,
    logWarn,
    logDebug,
    getUserLogs,
    getRecentErrors,
  };
};