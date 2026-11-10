"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logging_config_1 = __importDefault(require("../config/logging-config"));
// Custom database transport for Winston
class DatabaseTransport extends winston_1.default.transports.Stream {
    constructor(options) {
        super({
            stream: {
                write: (info) => {
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
                    }
                    catch (error) {
                        console.error('Error parsing log entry for database:', error);
                    }
                }
            }
        });
        this.connectionString = options.connectionString;
        this.tableName = options.tableName;
    }
}
class Logger {
    constructor() {
        this.config = (0, logging_config_1.default)();
        this.logger = this.createLogger();
    }
    createLogger() {
        const transports = [];
        const format = this.createFormat();
        // Console transport
        if (this.config.console.enabled) {
            transports.push(new winston_1.default.transports.Console({
                format: this.config.console.colorize
                    ? winston_1.default.format.combine(winston_1.default.format.colorize(), format)
                    : format
            }));
        }
        // File transport with daily rotation
        if (this.config.file.enabled) {
            // Ensure logs directory exists
            const logDir = path_1.default.dirname(this.config.file.filename);
            if (!fs_1.default.existsSync(logDir)) {
                fs_1.default.mkdirSync(logDir, { recursive: true });
            }
            transports.push(new winston_daily_rotate_file_1.default({
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
        return winston_1.default.createLogger({
            level: this.config.level,
            transports: transports,
            exitOnError: false,
            // Handle exceptions and rejections
            exceptionHandlers: this.config.file.enabled ? [
                new winston_daily_rotate_file_1.default({
                    filename: this.config.file.filename.replace('%DATE%', 'exceptions-%DATE%'),
                    datePattern: this.config.file.datePattern,
                    maxSize: this.config.file.maxSize,
                    maxFiles: this.config.file.maxFiles
                })
            ] : [],
            rejectionHandlers: this.config.file.enabled ? [
                new winston_daily_rotate_file_1.default({
                    filename: this.config.file.filename.replace('%DATE%', 'rejections-%DATE%'),
                    datePattern: this.config.file.datePattern,
                    maxSize: this.config.file.maxSize,
                    maxFiles: this.config.file.maxFiles
                })
            ] : []
        });
    }
    createFormat() {
        const formats = [];
        if (this.config.format.timestamp) {
            formats.push(winston_1.default.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }));
        }
        formats.push(winston_1.default.format.errors({ stack: true }));
        if (this.config.format.json) {
            formats.push(winston_1.default.format.json());
        }
        else {
            formats.push(winston_1.default.format.printf((_a) => {
                var { timestamp, level, message, stack } = _a, meta = __rest(_a, ["timestamp", "level", "message", "stack"]);
                let log = `${timestamp} [${level}]: ${message}`;
                if (stack) {
                    log += `\n${stack}`;
                }
                if (Object.keys(meta).length > 0) {
                    if (this.config.format.prettyPrint) {
                        log += `\n${JSON.stringify(meta, null, 2)}`;
                    }
                    else {
                        log += ` ${JSON.stringify(meta)}`;
                    }
                }
                return log;
            }));
        }
        return winston_1.default.format.combine(...formats);
    }
    // Logging methods
    error(message, meta) {
        this.logger.error(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    http(message, meta) {
        this.logger.http(message, meta);
    }
    verbose(message, meta) {
        this.logger.verbose(message, meta);
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    silly(message, meta) {
        this.logger.silly(message, meta);
    }
    // Convenience methods
    logRequest(req, res, responseTime) {
        this.http('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            responseTime: responseTime ? `${responseTime}ms` : undefined
        });
    }
    logError(error, context) {
        this.error(`${context ? context + ': ' : ''}${error.message}`, {
            stack: error.stack,
            context
        });
    }
    // Get the underlying Winston logger instance
    getLogger() {
        return this.logger;
    }
    // Reconfigure logger (useful for runtime configuration changes)
    reconfigure() {
        this.config = (0, logging_config_1.default)();
        this.logger = this.createLogger();
    }
}
// Create and export a singleton instance
const logger = new Logger();
exports.default = logger;
