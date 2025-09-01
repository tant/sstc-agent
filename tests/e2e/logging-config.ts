// Logging configuration for E2E tests
export interface LoggingConfig {
  enabled: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  saveConversations: boolean;
  saveTestResults: boolean;
  saveFullResponse: boolean;
  logToFile: boolean;
  logToConsole: boolean;
  conversationLogFormat: 'json' | 'text';
  maxLogFileSize: number; // in MB
  maxLogFiles: number;
  logRetentionDays: number; // Days to keep logs
}

// Default logging configuration
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  enabled: true,
  logLevel: 'INFO',
  saveConversations: true,
  saveTestResults: true,
  saveFullResponse: true,
  logToFile: true,
  logToConsole: true,
  conversationLogFormat: 'json',
  maxLogFileSize: 10, // 10MB
  maxLogFiles: 50,
  logRetentionDays: 30 // Keep logs for 30 days
};

// Test logging configuration
export const TEST_LOGGING_CONFIG: LoggingConfig = {
  enabled: true,
  logLevel: 'DEBUG',
  saveConversations: true,
  saveTestResults: true,
  saveFullResponse: true,
  logToFile: true,
  logToConsole: true,
  conversationLogFormat: 'json',
  maxLogFileSize: 50, // 50MB for tests
  maxLogFiles: 100,
  logRetentionDays: 7 // Keep test logs for 7 days
};

// Production logging configuration
export const PROD_LOGGING_CONFIG: LoggingConfig = {
  enabled: true,
  logLevel: 'WARN',
  saveConversations: false,
  saveTestResults: true,
  saveFullResponse: false,
  logToFile: true,
  logToConsole: false,
  conversationLogFormat: 'json',
  maxLogFileSize: 5, // 5MB
  maxLogFiles: 20,
  logRetentionDays: 90 // Keep production logs for 90 days
};

// Get logging configuration based on environment
export function getLoggingConfig(): LoggingConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'test':
      return TEST_LOGGING_CONFIG;
    case 'production':
      return PROD_LOGGING_CONFIG;
    default:
      return DEFAULT_LOGGING_CONFIG;
  }
}

// Log levels priority
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Check if log level should be logged
export function shouldLog(level: keyof typeof LOG_LEVELS, config: LoggingConfig): boolean {
  if (!config.enabled) return false;
  
  const currentLevel = LOG_LEVELS[config.logLevel as keyof typeof LOG_LEVELS];
  const messageLevel = LOG_LEVELS[level];
  
  return messageLevel >= currentLevel;
}

// Clean up old log files based on retention policy
export function cleanupOldLogs(logsDir: string, retentionDays: number) {
  try {
    if (!fs.existsSync(logsDir)) {
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted old log file: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Error cleaning up old logs:', error);
  }
}