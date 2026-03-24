import { Request, Response, NextFunction } from 'express';
import { DependencyContainer } from 'tsyringe';

/**
 * Wrapper to resolve a controller from the request's DI container
 * and execute a method on it
 */
export function resolveController<T>(
    controllerClass: new (...args: any[]) => T,
    method: keyof T
) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const container: DependencyContainer = (req as any).container;
            
            if (!container) {
                throw new Error('DI container not found on request. Did you forget the requestContextMiddleware?');
            }
            
            const controller = container.resolve(controllerClass as any);
            const handler = (controller as any)[method];
            
            if (typeof handler !== 'function') {
                throw new Error(`Method ${String(method)} not found on controller`);
            }
            
            return handler.call(controller, req, res, next);
        } catch (error) {
            next(error);
        }
    };
}
