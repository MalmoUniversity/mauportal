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
require("reflect-metadata"); // Must be first import for TSyringe
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const index_1 = require("./routes/index");
const navigation_manager_1 = __importDefault(require("./models/navigation/navigation-manager"));
const cors_1 = __importDefault(require("cors"));
const config_1 = __importDefault(require("config"));
const logger_1 = __importDefault(require("./core/utils/logger"));
const logging_middleware_1 = require("./middleware/logging-middleware");
const di_middleware_1 = require("./middleware/di-middleware");
const audit_log_middleware_1 = require("./middleware/audit-log-middleware");
const database_1 = __importDefault(require("./core/utils/database"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
navigation_manager_1.default.load(config_1.default.get('portal-config.path'), config_1.default.get('portal-config.root-file'));
logger_1.default.info('Portal Config Path:', { path: config_1.default.get('portal-config.path') });
logger_1.default.info('Portal Config Read Model:', { readModel: config_1.default.get('portal-config.read-model') });
// Initialize logging
logger_1.default.info('Starting MAU Arkiv application', { port: PORT, nodeEnv: process.env.NODE_ENV });
try {
    navigation_manager_1.default.load("/etc/mau/mau-arkiv/config/portal-main", config_1.default.get('portal-config.root-file'));
    logger_1.default.info('Navigation configuration loaded successfully');
}
catch (error) {
    logger_1.default.error('Failed to load navigation configuration', { error: error instanceof Error ? error.message : error });
}
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static('public'));
// Session configuration
const samlConfig = config_1.default.get('saml');
app.use((0, express_session_1.default)({
    secret: samlConfig.sessionSecret || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : undefined
    }
}));
// DI middleware - must come after session middleware
app.use(di_middleware_1.requestContextMiddleware);
// Add logging middleware
app.use((0, logging_middleware_1.createLoggingMiddleware)({
    enabled: process.env.LOG_HTTP_ENABLED !== 'false',
    logRequestBody: process.env.LOG_HTTP_REQUEST_BODY === 'true',
    logResponseBody: process.env.LOG_HTTP_RESPONSE_BODY === 'true',
    maxBodyLength: parseInt(process.env.LOG_HTTP_MAX_BODY_LENGTH || '1000'),
    skipPaths: ['/favicon.ico', '/robots.txt', '/assets']
}));
// Add audit log middleware (logs user requests to database)
app.use((0, audit_log_middleware_1.createAuditLogMiddleware)({
    enabled: config_1.default.get('audit-log.enabled') || false,
    logBody: true,
    maxBodyLength: 5000,
    skipPaths: ['/favicon.ico', '/robots.txt', '/assets', '/health'],
    skipMethods: [] // Log all HTTP methods
}));
// Enable CORS for all routes (make it conditional to be run only in development)
app.use((0, cors_1.default)({
    origin: 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
logger_1.default.info('Middleware configured successfully');
// Set up routes
(0, index_1.setRoutes)(app);
const xslTransformConfig = config_1.default.get('archive.xslTransform');
if (xslTransformConfig) {
    if (xslTransformConfig !== 'server' && xslTransformConfig !== 'client') {
        logger_1.default.warn('Invalid XSL Transform configuration. Expected "server" or "client". Defaulting to "server".', { xslTransformConfig });
    }
    else {
        logger_1.default.info('XSL Transform configuration', { xslTransform: xslTransformConfig });
    }
}
// Serve the Angular frontend for all other routes.This is needed for runnig via pm2.
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});
// Serve index.html for all routes starting with 'content' to support client-side routing
app.get('/content/*', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});
// Error handling middleware
app.use((error, req, res, next) => {
    logger_1.default.error('Unhandled application error', {
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
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Run database migrations on startup
            logger_1.default.info('Running database migrations...');
            yield database_1.default.migrate.latest();
            logger_1.default.info('Database migrations completed successfully');
        }
        catch (error) {
            logger_1.default.error('Database migration failed', {
                error: error instanceof Error ? error.message : error
            });
            // Continue starting the server even if migrations fail
            logger_1.default.warn('Server starting without migrations');
        }
        app.listen(PORT, () => {
            logger_1.default.info(`Server is running on http://localhost:${PORT}`, {
                port: PORT,
                environment: process.env.NODE_ENV || 'development'
            });
        });
    });
}
// Start the server
startServer();
// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection', { reason, promise });
});
