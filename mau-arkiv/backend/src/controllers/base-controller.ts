import { Request, Response } from 'express';
import { RequestContext } from '../services/request-context.service';
import { User } from '../core/types/user.types';
import logger from '../core/utils/logger';
import config from 'config';

/**
 * Base controller that provides access to the request context
 * All controllers should extend this to get access to currentUser
 */
export abstract class BaseController {
    constructor(protected requestContext: RequestContext) {}

    /**
     * Get the current authenticated user
     */
    protected get currentUser(): User | undefined {
        const user = this.requestContext.user;
        logger.debug('Accessing currentUser', { 
            hasUser: !!user,
            email: user?.email,
            nameID: user?.nameID
        });
        return user;
    }

    /**
     * Check if user is authenticated
     */
    protected get isAuthenticated(): boolean {
        return this.requestContext.isAuthenticated;
    }

    /**
     * Require authentication - throws if not authenticated
     */
    protected requireAuth(): User {
        return this.requestContext.requireAuth();
    }

    /**
     * Check if the current user has access to any of the specified privilege groups
     * @param privilegeGroups - Array of privilege groups to check
     * @returns true if user has at least one matching role, false otherwise
     */
    protected hasPrivilege(privilegeGroups: string[] | undefined): boolean {

        // If no privilege groups specified, access is granted
        if (!privilegeGroups || privilegeGroups.length === 0) {
            return false;
        }

        const user = this.currentUser;
        if (!user) {
            return false;
        }

        const userRoles = user.roles || [];
        return privilegeGroups.some(group => userRoles.includes(group));
    }

    /**
     * Send unauthorized response
     */
    protected unauthorized(res: Response, message: string = 'Unauthorized'): void {
        logger.warn('Unauthorized access attempt', { message });
        res.status(401).json({ error: message });
    }

    /**
     * Send forbidden response
     */
    protected forbidden(res: Response, message: string = 'Forbidden'): void {
        logger.warn('Forbidden access attempt', { message });
        res.status(403).json({ error: message });
    }

    /**
     * Send success response
     */
    protected success<T>(res: Response, data: T, message?: string): void {
        res.json({ success: true, data, message });
    }

    /**
     * Send error response
     */
    protected error(res: Response, message: string, statusCode: number = 500): void {
        logger.error('Controller error', { message, statusCode });
        res.status(statusCode).json({ success: false, error: message });
    }
}
