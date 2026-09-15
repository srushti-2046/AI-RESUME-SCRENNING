/**
 * Production Resilience Logger
 * Environment-guarded structured logging system.
 * Suppresses verbose debug logs in production (import.meta.env.PROD).
 * Supports correlation IDs for distributed tracing and async workflows.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  correlationId?: string;
  data?: unknown;
}

class Logger {
  private isProd: boolean;
  private buffer: LogEntry[] = [];
  private readonly maxBufferSize = 100;

  constructor() {
    this.isProd = Boolean(import.meta.env.PROD);
  }

  /**
   * Generates a unique correlation ID for tracking user journeys or batch operations
   */
  public generateCorrelationId(prefix: string = 'req'): string {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now().toString(36);
    return `${prefix}-${timestamp}-${randomSuffix}`;
  }

  private format(level: LogLevel, context: string, message: string, data?: unknown, correlationId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      correlationId,
      data,
    };
  }

  private record(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  public getTelemetryLogs(): LogEntry[] {
    return [...this.buffer];
  }

  public debug(context: string, message: string, data?: unknown, correlationId?: string): void {
    const entry = this.format('debug', context, message, data, correlationId);
    this.record(entry);
    if (this.isProd) return; // Zero console noise in production
    console.debug(`%c[DEBUG][${context}]`, 'color: #94a3b8; font-weight: bold;', message, data ?? '', correlationId ? `(${correlationId})` : '');
  }

  public info(context: string, message: string, data?: unknown, correlationId?: string): void {
    const entry = this.format('info', context, message, data, correlationId);
    this.record(entry);
    console.info(`%c[INFO][${context}]`, 'color: #38bdf8; font-weight: bold;', message, data ?? '', correlationId ? `(${correlationId})` : '');
  }

  public warn(context: string, message: string, data?: unknown, correlationId?: string): void {
    const entry = this.format('warn', context, message, data, correlationId);
    this.record(entry);
    console.warn(`%c[WARN][${context}]`, 'color: #f59e0b; font-weight: bold;', message, data ?? '', correlationId ? `(${correlationId})` : '');
  }

  public error(context: string, message: string, error?: unknown, correlationId?: string): void {
    const entry = this.format('error', context, message, error, correlationId);
    this.record(entry);
    console.error(`%c[ERROR][${context}]`, 'color: #ef4444; font-weight: bold;', message, error ?? '', correlationId ? `(${correlationId})` : '');
  }
}

export const logger = new Logger();

