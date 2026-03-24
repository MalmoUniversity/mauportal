import { Request, Response, NextFunction } from 'express';
import logger from '../core/utils/logger';

export interface LoggingMiddlewareOptions {
    enabled?: boolean;
    skipPaths?: string[];
    logRequestBody?: boolean;
    logResponseBody?: boolean;
    maxBodyLength?: number;
}

const defaultOptions: LoggingMiddlewareOptions = {
    enabled: true,
    skipPaths: ['/favicon.ico', '/robots.txt'],
    logRequestBody: false,
    logResponseBody: false,
    maxBodyLength: 1000
};

export function createLoggingMiddleware(options: LoggingMiddlewareOptions = {}) {
    const config = { ...defaultOptions, ...options };

    return (req: Request, res: Response, next: NextFunction) => {
        if (!config.enabled) {
            return next();
        }

        // Skip logging for specified paths
        if (config.skipPaths && config.skipPaths.includes(req.path)) {
            return next();
        }

        const startTime = Date.now();
        
        // Log request
        const requestData: any = {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            headers: req.headers
        };

        if (config.logRequestBody && req.body) {
            let body = JSON.stringify(req.body);
            if (config.maxBodyLength && body.length > config.maxBodyLength) {
                body = body.substring(0, config.maxBodyLength) + '... (truncated)';
            }
            requestData.body = body;
        }

        logger.http('Incoming request', requestData);

        // Capture the original send method
        const originalSend = res.send;
        let responseBody: any;

        res.send = function(body: any) {
            responseBody = body;
            return originalSend.call(this, body);
        };

        // Log response when finished
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            
            const responseData: any = {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                contentLength: res.get('Content-Length')
            };

            if (config.logResponseBody && responseBody) {
                let body = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
                if (config.maxBodyLength && body.length > config.maxBodyLength) {
                    body = body.substring(0, config.maxBodyLength) + '... (truncated)';
                }
                responseData.responseBody = body;
            }

            // Log based on status code
            if (res.statusCode >= 500) {
                logger.error('HTTP Error Response', responseData);
            } else if (res.statusCode >= 400) {
                logger.warn('HTTP Client Error', responseData);
            } else {
                logger.http('HTTP Response', responseData);
            }
        });

        next();
    };
}
