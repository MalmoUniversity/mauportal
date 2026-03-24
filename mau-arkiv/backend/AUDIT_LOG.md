# Audit Log Middleware

This document describes the audit log middleware implementation for the MAU Arkiv application.

## Overview

The audit log middleware automatically logs all user requests to a database table called `AuditLog` in the `Arkiv_app` database. This provides a comprehensive audit trail of user actions within the application.

## Features

- **Automatic Logging**: Captures all HTTP requests automatically
- **User Tracking**: Logs user information from the session
- **Detailed Information**: Records timestamp, user, URL, HTTP verb, request body, IP address, and user agent
- **Configurable**: Can be enabled/disabled and configured to skip certain paths or HTTP methods
- **Non-blocking**: Errors in logging don't affect the main application flow

## Database Schema

The `AuditLog` table has the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | INT (Primary Key) | Auto-incrementing unique identifier |
| timestamp | DATETIME | When the request was made |
| user | VARCHAR(255) | User identifier from session (nameID, email, or displayName) |
| url | VARCHAR(2000) | The requested URL |
| verb | VARCHAR(10) | HTTP method (GET, POST, PUT, DELETE, etc.) |
| body | TEXT | Request body as JSON string (truncated if too long) |
| ip | VARCHAR(45) | Client IP address (supports IPv6) |
| userAgent | VARCHAR(500) | User agent string |
| createdAt | DATETIME | Record creation timestamp |

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Database Configuration
DB_SERVER=your-mssql-server
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_ENCRYPT=false
DB_TRUST_CERT=true

# Audit Log Configuration (optional)
AUDIT_LOG_ENABLED=true
```

### 2. Run Database Migration

Run the migration to create the AuditLog table:

```bash
npm run migrate:latest
```

To rollback the migration:

```bash
npm run migrate:rollback
```

### 3. Verify Installation

The middleware is already configured in `src/app.ts` and will start logging requests automatically when the application starts.

## Configuration Options

The audit log middleware accepts the following options:

```typescript
{
    enabled: boolean,           // Enable/disable audit logging (default: true)
    skipPaths: string[],       // Paths to skip (default: ['/favicon.ico', '/robots.txt', '/assets', '/health'])
    skipMethods: string[],     // HTTP methods to skip (default: [])
    logBody: boolean,          // Log request body (default: true)
    maxBodyLength: number      // Maximum body length to log (default: 5000)
}
```

## Usage Examples

### Querying Audit Logs

```sql
-- Get all requests by a specific user
SELECT * FROM AuditLog 
WHERE [user] = 'user@example.com' 
ORDER BY timestamp DESC;

-- Get all POST requests in the last 24 hours
SELECT * FROM AuditLog 
WHERE verb = 'POST' 
AND timestamp > DATEADD(hour, -24, GETDATE())
ORDER BY timestamp DESC;

-- Count requests by HTTP method
SELECT verb, COUNT(*) as count 
FROM AuditLog 
GROUP BY verb;

-- Get recent activity for a specific endpoint
SELECT [user], verb, timestamp, ip 
FROM AuditLog 
WHERE url LIKE '%/api/search%'
ORDER BY timestamp DESC;
```

### Disabling Audit Logging

To temporarily disable audit logging, set the environment variable:

```env
AUDIT_LOG_ENABLED=false
```

Or modify the configuration in `src/app.ts`:

```typescript
app.use(createAuditLogMiddleware({
    enabled: false  // Disable audit logging
}));
```

## Database Migrations

### Create a New Migration

```bash
npm run migrate:make migration_name
```

### Run All Pending Migrations

```bash
npm run migrate:latest
```

### Rollback Last Migration

```bash
npm run migrate:rollback
```

## Technical Details

### Architecture

1. **Knex.js**: Used as the SQL query builder and migration tool
2. **Tedious**: MSSQL driver for Node.js (used by Knex)
3. **Express Middleware**: Intercepts all requests before they reach route handlers
4. **Session Integration**: Extracts user information from Express session

### Files

- `src/middleware/audit-log-middleware.ts` - Main middleware implementation
- `src/core/utils/database.ts` - Knex database connection
- `knexfile.ts` - Knex configuration
- `database/migrations/20251208000001_create_audit_log_table.ts` - Database migration

### Error Handling

The middleware is designed to fail gracefully. If an error occurs while logging (e.g., database connection issues), the error is logged using Winston but the request continues to be processed normally. This ensures that audit logging failures don't impact the user experience.

## Security Considerations

1. **Sensitive Data**: The request body is logged, which may contain sensitive information. Consider:
   - Filtering sensitive fields before logging
   - Encrypting the audit log table
   - Setting appropriate database access permissions

2. **Data Retention**: Consider implementing a data retention policy:
   ```sql
   -- Example: Delete audit logs older than 90 days
   DELETE FROM AuditLog 
   WHERE timestamp < DATEADD(day, -90, GETDATE());
   ```

3. **Performance**: Audit logging adds a small overhead to each request. Monitor database performance and consider:
   - Adding indexes for frequently queried fields
   - Archiving old logs to a separate table
   - Using async logging if performance becomes an issue

## Troubleshooting

### Migration Fails

If the migration fails, check:
1. Database connection settings in `.env`
2. Database user has CREATE TABLE permissions
3. The `Arkiv_app` database exists

### No Logs Being Created

If no audit logs are being created:
1. Check `AUDIT_LOG_ENABLED` environment variable
2. Verify database connection in `knexfile.ts`
3. Check application logs for errors
4. Verify the AuditLog table exists

### Performance Issues

If audit logging causes performance issues:
1. Reduce `maxBodyLength` to log less data
2. Add more paths to `skipPaths`
3. Consider adding indexes to the AuditLog table
4. Archive old audit logs regularly

## Future Enhancements

Potential improvements for the audit log system:

- [ ] Add filtering for sensitive fields in request body
- [ ] Implement automatic log archiving
- [ ] Add audit log viewer UI
- [ ] Add response status code and response time logging
- [ ] Implement log aggregation and analytics
- [ ] Add support for custom metadata
