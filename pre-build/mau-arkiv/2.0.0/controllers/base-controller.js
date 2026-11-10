"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const logger_1 = __importDefault(require("../core/utils/logger"));
/**
 * Base controller that provides access to the request context
 * All controllers should extend this to get access to currentUser
 */
class BaseController {
    constructor(requestContext) {
        this.requestContext = requestContext;
    }
    /**
     * Get the current authenticated user
     */
    get currentUser() {
        const user = this.requestContext.user;
        logger_1.default.debug('Accessing currentUser', {
            hasUser: !!user,
            email: user === null || user === void 0 ? void 0 : user.email,
            nameID: user === null || user === void 0 ? void 0 : user.nameID
        });
        return user;
    }
    /**
     * Check if user is authenticated
     */
    get isAuthenticated() {
        return this.requestContext.isAuthenticated;
    }
    /**
     * Require authentication - throws if not authenticated
     */
    requireAuth() {
        return this.requestContext.requireAuth();
    }
    /**
     * Check if the current user has access to any of the specified privilege groups
     * @param privilegeGroups - Array of privilege groups to check
     * @returns true if user has at least one matching role, false otherwise
     */
    hasPrivilege(privilegeGroups) {
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
    unauthorized(res, message = 'Unauthorized') {
        logger_1.default.warn('Unauthorized access attempt', { message });
        res.status(401).json({ error: message });
    }
    /**
     * Send forbidden response
     */
    forbidden(res, message = 'Forbidden') {
        logger_1.default.warn('Forbidden access attempt', { message });
        res.status(403).json({ error: message });
    }
    /**
     * Send success response
     */
    success(res, data, message) {
        res.json({ success: true, data, message });
    }
    /**
     * Send error response
     */
    error(res, message, statusCode = 500) {
        logger_1.default.error('Controller error', { message, statusCode });
        res.status(statusCode).json({ success: false, error: message });
    }
}
exports.BaseController = BaseController;
