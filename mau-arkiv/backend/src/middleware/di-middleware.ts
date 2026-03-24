import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { RequestContext } from '../services/request-context.service';
import logger from '../core/utils/logger';

/**
 * Middleware to create a DI container per request and set up the request context
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
    // Create a child container for this request
    const requestContainer = container.createChildContainer();
    
    // Create RequestContext instance
    const requestContext = new RequestContext();
    
    // Populate it with session data BEFORE registering
    if (req.session?.user) {
        requestContext.setUser(req.session.user);
        logger.debug('Request context initialized with user', { 
            email: req.session.user.email,
            nameID: req.session.user.nameID,
            path: req.path 
        });
    } else {
        logger.debug('Request context initialized without user', { 
            path: req.path,
            hasSession: !!req.session,
            sessionId: req.session?.id
        });
    }
    
    // Register the populated RequestContext instance as a singleton within this request
    requestContainer.registerInstance(RequestContext, requestContext);
    
    // Attach the container to the request so controllers can use it
    (req as any).container = requestContainer;
    
    // Clean up after response
    res.on('finish', () => {
        requestContext.clear();
    });
    
    next();
}
