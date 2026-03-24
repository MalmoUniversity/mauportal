import path from 'path';
import config from 'config';

export interface LoggingConfig {
    level: string;
    console: {
        enabled: boolean;
        colorize: boolean;
    };
    file: {
        enabled: boolean;
        filename: string;
        maxSize: string;
        maxFiles: string;
        datePattern: string;
    };
    database: {
        enabled: boolean;
        connectionString?: string;
        tableName: string;
    };
    format: {
        timestamp: boolean;
        json: boolean;
        prettyPrint: boolean;
    };
}

const getLoggingConfig = (): LoggingConfig => {
    return {
        level: config.get<string>('logging.level') || 'info',
        console: {
            enabled: config.get<boolean>('logging.console.enabled') !== false,
            colorize: config.get<boolean>('logging.console.colorize') !== false
        },
        file: {
            enabled: config.get<boolean>('logging.file.enabled') !== false,
            filename: config.get<string>('logging.file.filename') || path.join(process.cwd(), 'logs', 'mau-arkiv-%DATE%.log'),
            maxSize: config.get<string>('logging.file.maxSize') || '20m',
            maxFiles: config.get<string>('logging.file.maxFiles') || '14d',
            datePattern: config.get<string>('logging.file.datePattern') || 'YYYY-MM-DD'
        },
        database: {
            enabled: config.get<boolean>('logging.database.enabled') === true,
            connectionString: config.get<string>('logging.database.connectionString'),
            tableName: config.get<string>('logging.database.tableName') || 'application_logs'
        },
        format: {
            timestamp: config.get<boolean>('logging.format.timestamp') !== false,
            json: config.get<boolean>('logging.format.json') === true,
            prettyPrint: config.get<boolean>('logging.format.prettyPrint') === true
        }
    };
};

export default getLoggingConfig;
