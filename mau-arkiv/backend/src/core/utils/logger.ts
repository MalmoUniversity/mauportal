import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';
import getLoggingConfig, { LoggingConfig } from '../config/logging-config';

// Custom database transport for Winston
class DatabaseTransport extends winston.transports.Stream {
    private connectionString: string;
    private tableName: string;

    constructor(options: { connectionString: string; tableName: string }) {
        super({
            stream: {
                write: (info: string) => {
                    try {
                        const logEntry = JSON.parse(info);
                        // For demonstration purposes, we'll log to console that this would go to database
                        // In a real implementation, you would use a database client like pg, mysql2, etc.
                        console.log(`[DATABASE LOG] Would insert into ${this.tableName}:`, {
                            timestamp: new Date().toISOString(),
                            level: logEntry.level,
                            message: logEntry.message,
                            meta: logEntry.meta || {}
                        });
                    } catch (error) {
                        console.error('Error parsing log entry for database:', error);
                    }
                }
            } as any
        });
        this.connectionString = options.connectionString;
        this.tableName = options.tableName;
    }
}

class Logger {
    private logger: winston.Logger;
    private config: LoggingConfig;

    constructor() {
        this.config = getLoggingConfig();
        this.logger = this.createLogger();
    }

    private createLogger(): winston.Logger {
        const transports: winston.transport[] = [];
        const format = this.createFormat();

        // Console transport
        if (this.config.console.enabled) {
            transports.push(new winston.transports.Console({
                format: this.config.console.colorize 
                    ? winston.format.combine(
                        winston.format.colorize(),
                        format
                    )
                    : format
            }));
        }

        // File transport with daily rotation
        if (this.config.file.enabled) {
            // Ensure logs directory exists
            const logDir = path.dirname(this.config.file.filename);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            transports.push(new DailyRotateFile({
                filename: this.config.file.filename,
                datePattern: this.config.file.datePattern,
                maxSize: this.config.file.maxSize,
                maxFiles: this.config.file.maxFiles,
                format: format
            }));
        }

        // Database transport
        if (this.config.database.enabled && this.config.database.connectionString) {
            transports.push(new DatabaseTransport({
                connectionString: this.config.database.connectionString,
                tableName: this.config.database.tableName
            }));
        }

        return winston.createLogger({
            level: this.config.level,
            transports: transports,
            exitOnError: false,
            // Handle exceptions and rejections
            exceptionHandlers: this.config.file.enabled ? [
                new DailyRotateFile({
                    filename: this.config.file.filename.replace('%DATE%', 'exceptions-%DATE%'),
                    datePattern: this.config.file.datePattern,
                    maxSize: this.config.file.maxSize,
                    maxFiles: this.config.file.maxFiles
                })
            ] : [],
            rejectionHandlers: this.config.file.enabled ? [
                new DailyRotateFile({
                    filename: this.config.file.filename.replace('%DATE%', 'rejections-%DATE%'),
                    datePattern: this.config.file.datePattern,
                    maxSize: this.config.file.maxSize,
                    maxFiles: this.config.file.maxFiles
                })
            ] : []
        });
    }

    private createFormat(): winston.Logform.Format {
        const formats: winston.Logform.Format[] = [];

        if (this.config.format.timestamp) {
            formats.push(winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }));
        }

        formats.push(winston.format.errors({ stack: true }));

        if (this.config.format.json) {
            formats.push(winston.format.json());
        } else {
            formats.push(winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                let log = `${timestamp} [${level}]: ${message}`;

                if (stack) {
                    log += `\n${stack}`;
                }
                
                if (Object.keys(meta).length > 0) {
                    if (this.config.format.prettyPrint) {
                        log += `\n${JSON.stringify(meta, null, 2)}`;
                    } else {
                        log += ` ${JSON.stringify(meta)}`;
                    }
                }
                
                return log;
            }));
        }

        return winston.format.combine(...formats);
    }

    // Logging methods
    public error(message: string, meta?: any): void {
        this.logger.error(message, meta);
    }

    public warn(message: string, meta?: any): void {
        this.logger.warn(message, meta);
    }

    public info(message: string, meta?: any): void {
        this.logger.info(message, meta);
    }

    public http(message: string, meta?: any): void {
        this.logger.http(message, meta);
    }

    public verbose(message: string, meta?: any): void {
        this.logger.verbose(message, meta);
    }

    public debug(message: string, meta?: any): void {
        this.logger.debug(message, meta);
    }

    public silly(message: string, meta?: any): void {
        this.logger.silly(message, meta);
    }

    // Convenience methods
    public logRequest(req: any, res: any, responseTime?: number): void {
        this.http('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            responseTime: responseTime ? `${responseTime}ms` : undefined
        });
    }

    public logError(error: Error, context?: string): void {
        this.error(`${context ? context + ': ' : ''}${error.message}`, {
            stack: error.stack,
            context
        });
    }

    // Get the underlying Winston logger instance
    public getLogger(): winston.Logger {
        return this.logger;
    }

    // Reconfigure logger (useful for runtime configuration changes)
    public reconfigure(): void {
        this.config = getLoggingConfig();
        this.logger = this.createLogger();
    }
}

// Create and export a singleton instance
const logger = new Logger();
export default logger;
