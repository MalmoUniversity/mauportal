import logger from '../src/utils/logger';

// Test script to verify logging functionality
console.log('Testing Winston logging system...\n');

// Test different log levels
logger.error('This is an error message', { errorCode: 500, userId: 123 });
logger.warn('This is a warning message', { memoryUsage: '85%' });
logger.info('This is an info message', { action: 'user_login', userId: 123 });
logger.http('This is an HTTP log message', { method: 'GET', url: '/api/test' });
logger.verbose('This is a verbose message', { details: 'Additional information' });
logger.debug('This is a debug message', { debugData: { x: 1, y: 2 } });
logger.silly('This is a silly message', { randomData: Math.random() });

// Test error logging with stack trace
try {
    throw new Error('Test error for logging');
} catch (error) {
    logger.logError(error as Error, 'Test error context');
}

// Test structured logging
logger.info('User authentication', {
    userId: 'user123',
    email: 'user@example.com',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    success: true,
    timestamp: new Date().toISOString()
});

logger.info('Database query performance', {
    query: 'SELECT * FROM users WHERE active = true',
    executionTime: '150ms',
    rowsReturned: 42,
    cacheHit: false
});

console.log('\nTest completed! Check the logs directory for output files.');
console.log('If console logging is enabled, you should see the log messages above.');
