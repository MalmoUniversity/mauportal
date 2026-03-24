# Logging System Documentation

The MAU Arkiv application now includes a comprehensive logging system built with Winston. This system provides configurable logging to console, files, and databases with detailed request/response tracking.

## Features

- **Multiple Transport Support**: Console, file (with rotation), and database logging
- **Configurable Log Levels**: Error, warn, info, http, verbose, debug, silly
- **HTTP Request Logging**: Automatic logging of all HTTP requests and responses
- **Structured Logging**: JSON and human-readable formats
- **File Rotation**: Daily log file rotation with configurable retention
- **Error Handling**: Automatic logging of uncaught exceptions and unhandled rejections
- **Environment-based Configuration**: Easy configuration via environment variables

## Configuration

### Environment Variables

Copy the `.env.example` file to create your configuration:

```bash
cp .env.example .env
```

### Available Configuration Options

#### Basic Logging
- `LOG_LEVEL`: Log level (error, warn, info, http, verbose, debug, silly) - Default: info
- `LOG_FORMAT_TIMESTAMP`: Include timestamps - Default: true
- `LOG_FORMAT_JSON`: Use JSON format - Default: false
- `LOG_FORMAT_PRETTY_PRINT`: Pretty print JSON metadata - Default: false

#### Console Logging
- `LOG_CONSOLE_ENABLED`: Enable console output - Default: true
- `LOG_CONSOLE_COLORIZE`: Colorize console output - Default: true

#### File Logging
- `LOG_FILE_ENABLED`: Enable file logging - Default: true
- `LOG_FILE_NAME`: Log file path pattern - Default: ./logs/mau-arkiv-%DATE%.log
- `LOG_FILE_MAX_SIZE`: Maximum file size - Default: 20m
- `LOG_FILE_MAX_FILES`: File retention period - Default: 14d
- `LOG_FILE_DATE_PATTERN`: Date pattern for file names - Default: YYYY-MM-DD

#### Database Logging
- `LOG_DATABASE_ENABLED`: Enable database logging - Default: false
- `LOG_DATABASE_CONNECTION`: Database connection string
- `LOG_DATABASE_TABLE`: Database table name - Default: application_logs

#### HTTP Request Logging
- `LOG_HTTP_ENABLED`: Enable HTTP request logging - Default: true
- `LOG_HTTP_REQUEST_BODY`: Log request bodies - Default: false
- `LOG_HTTP_RESPONSE_BODY`: Log response bodies - Default: false
- `LOG_HTTP_MAX_BODY_LENGTH`: Maximum body length to log - Default: 1000

## Usage Examples

### Basic Logging

```typescript
import logger from './utils/logger';

// Different log levels
logger.error('Something went wrong', { userId: 123, action: 'login' });
logger.warn('This is a warning', { condition: 'memory_high' });
logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
logger.debug('Debug information', { queryParams: req.query });

// Log errors with context
try {
  // Some operation
} catch (error) {
  logger.logError(error, 'User registration process');
}
```

### HTTP Request Logging

The logging middleware automatically logs all HTTP requests and responses. It can be configured to include request/response bodies:

```typescript
// In app.ts - already configured
app.use(createLoggingMiddleware({
    enabled: true,
    logRequestBody: false,  // Set to true to log request bodies
    logResponseBody: false, // Set to true to log response bodies
    maxBodyLength: 1000,    // Truncate large bodies
    skipPaths: ['/favicon.ico', '/robots.txt'] // Paths to skip
}));
```

### Controller Logging

```typescript
export class MyController {
    async getData(req: Request, res: Response): Promise<void> {
        const userId = req.params.userId;
        
        logger.info('Fetching user data', { userId });
        
        try {
            const data = await this.userService.getData(userId);
            logger.debug('User data retrieved', { userId, dataSize: data.length });
            res.json(data);
        } catch (error) {
            logger.error('Failed to fetch user data', { 
                userId, 
                error: error instanceof Error ? error.message : error 
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
```

## Log Output Examples

### Console Output (Development)
```
2024-10-07 14:30:15 [INFO]: Starting MAU Arkiv application {"port":3000,"nodeEnv":"development"}
2024-10-07 14:30:15 [INFO]: Navigation configuration loaded successfully
2024-10-07 14:30:15 [INFO]: Middleware configured successfully
2024-10-07 14:30:15 [INFO]: Server is running on http://localhost:3000 {"port":3000,"environment":"development"}
2024-10-07 14:30:20 [HTTP]: Incoming request {"method":"GET","url":"/api/nav/mau-arkiv-startsidan-uid","userAgent":"Mozilla/5.0...","ip":"::1"}
2024-10-07 14:30:20 [INFO]: Navigation item found {"uid":"mau-arkiv-startsidan","itemTitle":"MAU Arkiv","childrenCount":5}
2024-10-07 14:30:20 [HTTP]: HTTP Response {"method":"GET","url":"/api/nav/mau-arkiv-startsidan","statusCode":200,"responseTime":"15ms"}
```

### File Output (JSON Format)
```json
{"timestamp":"2024-10-07 14:30:15","level":"info","message":"Starting MAU Arkiv application","port":3000,"nodeEnv":"development"}
{"timestamp":"2024-10-07 14:30:20","level":"error","message":"Database connection failed","error":"Connection refused","stack":"Error: Connection refused\n    at ..."}
```

## Log Files Structure

When file logging is enabled, the following files are created:

- `logs/mau-arkiv-2024-10-07.log` - Main application logs
- `logs/exceptions-2024-10-07.log` - Uncaught exceptions
- `logs/rejections-2024-10-07.log` - Unhandled promise rejections

## Database Logging Setup

To enable database logging:

1. Set `LOG_DATABASE_ENABLED=true`
2. Configure your database connection string
3. Create the logs table (example for PostgreSQL):

```sql
CREATE TABLE application_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_application_logs_timestamp ON application_logs(timestamp);
CREATE INDEX idx_application_logs_level ON application_logs(level);
```

## Production Recommendations

### Log Levels
- **Production**: Use `info` or `warn` level
- **Staging**: Use `debug` level
- **Development**: Use `debug` or `silly` level

### File Logging
- Set appropriate retention: `LOG_FILE_MAX_FILES=30d` for production
- Use larger file sizes: `LOG_FILE_MAX_SIZE=100m` for production
- Store logs outside the application directory

### Security Considerations
- Never log sensitive data (passwords, tokens, personal information)
- Be careful with request/response body logging in production
- Ensure log files have proper file permissions
- Consider log aggregation services (ELK stack, Splunk, etc.)

### Performance
- Disable request/response body logging in production
- Use appropriate log levels to reduce I/O
- Consider asynchronous logging for high-traffic applications

## Monitoring and Alerting

You can integrate the logging system with monitoring tools:

1. **Log Aggregation**: Forward logs to ELK Stack, Splunk, or similar
2. **Error Tracking**: Integrate with Sentry, Rollbar, or similar services
3. **Metrics**: Extract metrics from log data for monitoring dashboards
4. **Alerting**: Set up alerts based on error rates or specific log patterns

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check `LOG_LEVEL` and ensure it includes the level you're logging at
2. **File permission errors**: Ensure the application has write access to the logs directory
3. **Database logging not working**: Verify database connection and table structure
4. **High disk usage**: Adjust `LOG_FILE_MAX_FILES` and `LOG_FILE_MAX_SIZE` settings

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
LOG_LEVEL=debug
LOG_HTTP_REQUEST_BODY=true
LOG_HTTP_RESPONSE_BODY=true
```

## Custom Extensions

The logging system can be extended with custom transports or formatters. See the `src/utils/logger.ts` file for implementation details.
