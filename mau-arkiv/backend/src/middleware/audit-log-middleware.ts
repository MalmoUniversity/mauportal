import { Request, Response, NextFunction } from 'express';
import db from '../core/utils/database';
import logger from '../core/utils/logger';
import { getCurrentLocalTime } from '../core/utils/date-utils';

export interface AuditLogOptions {
    enabled?: boolean;
    skipPaths?: string[];
    skipMethods?: string[];
    logBody?: boolean;
    maxBodyLength?: number;
}

const defaultOptions: AuditLogOptions = {
    enabled: true,
    skipPaths: ['/favicon.ico', '/robots.txt', '/assets', '/health'],
    skipMethods: [],
    logBody: true,
    maxBodyLength: 5000
};

export function createAuditLogMiddleware(options: AuditLogOptions = {}) {
    const config = { ...defaultOptions, ...options };

    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip if disabled
        if (!config.enabled) {
            return next();
        }

        // Skip logging for specified paths
        if (config.skipPaths && config.skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Skip logging for specified methods
        if (config.skipMethods && config.skipMethods.includes(req.method)) {
            return next();
        }

        try {
            // Extract user information from session
            const user = req.session?.user?.displayName || 
                         req.session?.user?.email || 
                         null;
            if(!user) {
                logger.debug('No user information found in session, skipping audit log entry', {
                    url: req.url,
                    method: req.method
                });
                
                return next();
            }

            // Prepare request body
            let bodyString: string | null = null;
            if (config.logBody && req.body && Object.keys(req.body).length > 0) {
                bodyString = JSON.stringify(req.body);
                // Truncate if too long
                if (config.maxBodyLength && bodyString.length > config.maxBodyLength) {
                    bodyString = bodyString.substring(0, config.maxBodyLength) + '... (truncated)';
                }
            }

            // Get IP address
            const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
                       req.ip ||
                       req.socket.remoteAddress ||
                       'unknown';

            // Get user agent
            const userAgent = req.get('User-Agent') || 'unknown';

            // Get current date/time in local timezone
            const localTimestamp = getCurrentLocalTime();

            // Insert audit log entry into database
            await db('AuditLog').insert({
                timestamp: localTimestamp,
                user: user,
                url: req.originalUrl || req.url,
                verb: req.method,
                body: bodyString,
                ip: ip,
                userAgent: userAgent,
                createdAt: localTimestamp
            });

            logger.debug('Audit log entry created', {
                user,
                method: req.method,
                url: req.originalUrl || req.url
            });

        } catch (error) {
            // Log the error but don't block the request
            logger.error('Failed to create audit log entry', {
                error: error instanceof Error ? error.message : error,
                url: req.url,
                method: req.method
            });
        }

        next();
    };
}

export default createAuditLogMiddleware;
