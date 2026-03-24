import 'reflect-metadata'; // Must be first import for TSyringe
import 'dotenv/config';
import express, { Request, Response } from 'express';
import session from 'express-session';
import { setRoutes } from './routes/index';
import navigationManager from './models/navigation/navigation-manager';
import cors from 'cors';
import  config from 'config';
import logger from './core/utils/logger';
import { createLoggingMiddleware } from './middleware/logging-middleware';
import { requestContextMiddleware } from './middleware/di-middleware';
import { createAuditLogMiddleware } from './middleware/audit-log-middleware';
import db from './core/utils/database';

const app = express();
const PORT = process.env.PORT || 3000;

navigationManager.load(
  config.get('portal-config.path'), 
  config.get('portal-config.root-file'));
  
logger.info('Portal Config Path:', { path: config.get('portal-config.path') });
logger.info('Portal Config Read Model:', { readModel: config.get('portal-config.read-model') });
// Initialize logging
logger.info('Starting MAU Arkiv application', { port: PORT, nodeEnv: process.env.NODE_ENV });

try {
    navigationManager.load("/etc/mau/mau-arkiv/config/portal-main", config.get('portal-config.root-file'));
    logger.info('Navigation configuration loaded successfully');
} catch (error) {
    logger.error('Failed to load navigation configuration', { error: error instanceof Error ? error.message : error });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
const samlConfig = config.get<any>('saml');
app.use(session({
    secret: samlConfig.sessionSecret || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // false in development
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax', // Add this - important for cross-origin
        domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : undefined
    }
}));

// DI middleware - must come after session middleware
app.use(requestContextMiddleware);

// Add logging middleware
app.use(createLoggingMiddleware({
    enabled: process.env.LOG_HTTP_ENABLED !== 'false',
    logRequestBody: process.env.LOG_HTTP_REQUEST_BODY === 'true',
    logResponseBody: process.env.LOG_HTTP_RESPONSE_BODY === 'true',
    maxBodyLength: parseInt(process.env.LOG_HTTP_MAX_BODY_LENGTH || '1000'),
    skipPaths: ['/favicon.ico', '/robots.txt', '/assets']
}));

// Add audit log middleware (logs user requests to database)
app.use(createAuditLogMiddleware({
    enabled: config.get<boolean>('audit-log.enabled') || false,
    logBody: true,
    maxBodyLength: 5000,
    skipPaths: ['/favicon.ico', '/robots.txt', '/assets', '/health'],
    skipMethods: [] // Log all HTTP methods
}));

// Enable CORS for all routes (make it conditional to be run only in development)
app.use(cors({
    origin: 'http://localhost:4200', // Frontend URL, development only
    credentials: true, // CRITICAL: Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

logger.info('Middleware configured successfully');

// Set up routes
setRoutes(app);

// Serve the Angular frontend for all other routes.This is needed for runnig via pm2.
app.get('/', (req: Request, res: Response) => {
    res.sendFile('index.html', { root: 'public' });
});

// Serve index.html for all routes starting with 'content' to support client-side routing
app.get('/content/*', (req: Request, res: Response) => {
    res.sendFile('index.html', { root: 'public' });
});


// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: any) => {
    logger.error('Unhandled application error', { 
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    });
    
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start the server
async function startServer() {
    try {
        // Run database migrations on startup
        logger.info('Running database migrations...');
        await db.migrate.latest();
        logger.info('Database migrations completed successfully');
    } catch (error) {
        logger.error('Database migration failed', { 
            error: error instanceof Error ? error.message : error 
        });
        // Continue starting the server even if migrations fail
        logger.warn('Server starting without migrations');
    }

    app.listen(PORT, () => {
        logger.info(`Server is running on http://localhost:${PORT}`, { 
            port: PORT,
            environment: process.env.NODE_ENV || 'development'
        });
    });
}

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

