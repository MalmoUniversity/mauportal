"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContextMiddleware = void 0;
const tsyringe_1 = require("tsyringe");
const request_context_service_1 = require("../services/request-context.service");
const logger_1 = __importDefault(require("../core/utils/logger"));
/**
 * Middleware to create a DI container per request and set up the request context
 */
function requestContextMiddleware(req, res, next) {
    var _a, _b;
    // Create a child container for this request
    const requestContainer = tsyringe_1.container.createChildContainer();
    // Create RequestContext instance
    const requestContext = new request_context_service_1.RequestContext();
    // Populate it with session data BEFORE registering
    if ((_a = req.session) === null || _a === void 0 ? void 0 : _a.user) {
        requestContext.setUser(req.session.user);
        logger_1.default.debug('Request context initialized with user', {
            email: req.session.user.email,
            nameID: req.session.user.nameID,
            path: req.path
        });
    }
    else {
        logger_1.default.debug('Request context initialized without user', {
            path: req.path,
            hasSession: !!req.session,
            sessionId: (_b = req.session) === null || _b === void 0 ? void 0 : _b.id
        });
    }
    // Register the populated RequestContext instance as a singleton within this request
    requestContainer.registerInstance(request_context_service_1.RequestContext, requestContext);
    // Attach the container to the request so controllers can use it
    req.container = requestContainer;
    // Clean up after response
    res.on('finish', () => {
        requestContext.clear();
    });
    next();
}
exports.requestContextMiddleware = requestContextMiddleware;
