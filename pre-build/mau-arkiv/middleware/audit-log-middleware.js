"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLogMiddleware = void 0;
const database_1 = __importDefault(require("../core/utils/database"));
const logger_1 = __importDefault(require("../core/utils/logger"));
const date_utils_1 = require("../core/utils/date-utils");
const defaultOptions = {
    enabled: true,
    skipPaths: ['/favicon.ico', '/robots.txt', '/assets', '/health'],
    skipMethods: [],
    logBody: true,
    maxBodyLength: 5000
};
function createAuditLogMiddleware(options = {}) {
    const config = Object.assign(Object.assign({}, defaultOptions), options);
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
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
            const user = ((_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.displayName) ||
                ((_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.email) ||
                null;
            if (!user) {
                logger_1.default.debug('No user information found in session, skipping audit log entry', {
                    url: req.url,
                    method: req.method
                });
                return next();
            }
            // Prepare request body
            let bodyString = null;
            if (config.logBody && req.body && Object.keys(req.body).length > 0) {
                bodyString = JSON.stringify(req.body);
                // Truncate if too long
                if (config.maxBodyLength && bodyString.length > config.maxBodyLength) {
                    bodyString = bodyString.substring(0, config.maxBodyLength) + '... (truncated)';
                }
            }
            // Get IP address
            const ip = ((_e = req.headers['x-forwarded-for']) === null || _e === void 0 ? void 0 : _e.split(',')[0].trim()) ||
                req.ip ||
                req.socket.remoteAddress ||
                'unknown';
            // Get user agent
            const userAgent = req.get('User-Agent') || 'unknown';
            // Get current date/time in local timezone
            const localTimestamp = (0, date_utils_1.getCurrentLocalTime)();
            // Insert audit log entry into database
            yield (0, database_1.default)('AuditLog').insert({
                timestamp: localTimestamp,
                user: user,
                url: req.originalUrl || req.url,
                verb: req.method,
                body: bodyString,
                ip: ip,
                userAgent: userAgent,
                createdAt: localTimestamp
            });
            logger_1.default.debug('Audit log entry created', {
                user,
                method: req.method,
                url: req.originalUrl || req.url
            });
        }
        catch (error) {
            // Log the error but don't block the request
            logger_1.default.error('Failed to create audit log entry', {
                error: error instanceof Error ? error.message : error,
                url: req.url,
                method: req.method
            });
        }
        next();
    });
}
exports.createAuditLogMiddleware = createAuditLogMiddleware;
exports.default = createAuditLogMiddleware;
