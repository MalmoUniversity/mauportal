"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveController = void 0;
/**
 * Wrapper to resolve a controller from the request's DI container
 * and execute a method on it
 */
function resolveController(controllerClass, method) {
    return (req, res, next) => {
        try {
            const container = req.container;
            if (!container) {
                throw new Error('DI container not found on request. Did you forget the requestContextMiddleware?');
            }
            const controller = container.resolve(controllerClass);
            const handler = controller[method];
            if (typeof handler !== 'function') {
                throw new Error(`Method ${String(method)} not found on controller`);
            }
            return handler.call(controller, req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.resolveController = resolveController;
