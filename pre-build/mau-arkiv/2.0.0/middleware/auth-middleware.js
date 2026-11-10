"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = void 0;
const logger_1 = __importDefault(require("../core/utils/logger"));
/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    }
    else {
        logger_1.default.warn('Unauthorized access attempt', {
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
exports.requireAuth = requireAuth;
/**
 * Optional middleware that adds user info if available but doesn't require it
 */
function optionalAuth(req, res, next) {
    // Just pass through, session will be available if user is logged in
    next();
}
exports.optionalAuth = optionalAuth;
