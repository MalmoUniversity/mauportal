"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoggingMiddleware = void 0;
const logger_1 = __importDefault(require("../core/utils/logger"));
const defaultOptions = {
    enabled: true,
    skipPaths: ['/favicon.ico', '/robots.txt'],
    logRequestBody: false,
    logResponseBody: false,
    maxBodyLength: 1000
};
function createLoggingMiddleware(options = {}) {
    const config = Object.assign(Object.assign({}, defaultOptions), options);
    return (req, res, next) => {
        if (!config.enabled) {
            return next();
        }
        // Skip logging for specified paths
        if (config.skipPaths && config.skipPaths.includes(req.path)) {
            return next();
        }
        const startTime = Date.now();
        // Log request
        const requestData = {
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
        logger_1.default.http('Incoming request', requestData);
        // Capture the original send method
        const originalSend = res.send;
        let responseBody;
        res.send = function (body) {
            responseBody = body;
            return originalSend.call(this, body);
        };
        // Log response when finished
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            const responseData = {
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
                logger_1.default.error('HTTP Error Response', responseData);
            }
            else if (res.statusCode >= 400) {
                logger_1.default.warn('HTTP Client Error', responseData);
            }
            else {
                logger_1.default.http('HTTP Response', responseData);
            }
        });
        next();
    };
}
exports.createLoggingMiddleware = createLoggingMiddleware;
