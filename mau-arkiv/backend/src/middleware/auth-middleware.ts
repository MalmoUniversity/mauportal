import { Request, Response, NextFunction } from 'express';
import logger from '../core/utils/logger';

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.user) {
        next();
    } else {
        logger.warn('Unauthorized access attempt', { 
            path: req.path,
            method: req.method,
            ip: req.ip 
        });
        res.status(401).json({ 
            error: 'Unauthorized',
            message: 'You must be logged in to access this resource'
        });
    }
}

/**
 * Optional middleware that adds user info if available but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    // Just pass through, session will be available if user is logged in
    next();
}
