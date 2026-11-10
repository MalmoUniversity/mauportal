"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("config"));
const getLoggingConfig = () => {
    return {
        level: config_1.default.get('logging.level') || 'info',
        console: {
            enabled: config_1.default.get('logging.console.enabled') !== false,
            colorize: config_1.default.get('logging.console.colorize') !== false
        },
        file: {
            enabled: config_1.default.get('logging.file.enabled') !== false,
            filename: config_1.default.get('logging.file.filename') || path_1.default.join(process.cwd(), 'logs', 'mau-arkiv-%DATE%.log'),
            maxSize: config_1.default.get('logging.file.maxSize') || '20m',
            maxFiles: config_1.default.get('logging.file.maxFiles') || '14d',
            datePattern: config_1.default.get('logging.file.datePattern') || 'YYYY-MM-DD'
        },
        database: {
            enabled: config_1.default.get('logging.database.enabled') === true,
            connectionString: config_1.default.get('logging.database.connectionString'),
            tableName: config_1.default.get('logging.database.tableName') || 'application_logs'
        },
        format: {
            timestamp: config_1.default.get('logging.format.timestamp') !== false,
            json: config_1.default.get('logging.format.json') === true,
            prettyPrint: config_1.default.get('logging.format.prettyPrint') === true
        }
    };
};
exports.default = getLoggingConfig;
