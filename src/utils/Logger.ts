/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 简单的日志记录器类
 */
export class Logger {
  private context: string;
  private level: LogLevel = LogLevel.INFO;

  /**
   * 构造函数
   * @param context 日志上下文名称
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 记录调试信息
   * @param message 日志消息
   * @param data 附加数据
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录一般信息
   * @param message 日志消息
   * @param data 附加数据
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告信息
   * @param message 日志消息
   * @param data 附加数据
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录错误信息
   * @param message 日志消息
   * @param data 附加数据
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   * @param level 日志级别
   * @returns 是否应该记录
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(level);
    
    return targetLevelIndex >= currentLevelIndex;
  }
} 