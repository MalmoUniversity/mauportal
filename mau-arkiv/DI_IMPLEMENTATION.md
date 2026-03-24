# Dependency Injection Implementation Guide

## Overview

Your MAU Arkiv backend now uses **TSyringe** for Dependency Injection, providing access to the authenticated user across all controllers.

## What Was Implemented

### 1. **Core DI Infrastructure**

#### `src/services/request-context.service.ts`
- Request-scoped service that holds the current authenticated user
- Provides helper methods: `user`, `isAuthenticated`, `requireAuth()`
- Automatically populated from session data

#### `src/middleware/di-middleware.ts`
- Creates a child DI container per request
- Populates `RequestContext` with session user data
- Attaches container to request for controller resolution

#### `src/controllers/base-controller.ts`
- Base class for all controllers
- Provides easy access to `currentUser` via property
- Helper methods: `requireAuth()`, `unauthorized()`, `success()`, `error()`

#### `src/utils/controller-resolver.ts`
- Resolves controllers from the request's DI container
- Used in routes to instantiate controllers with dependencies

### 2. **Updated Files**

- **tsconfig.json** - Enabled decorator support
- **app.ts** - Added `reflect-metadata` import and DI middleware
- **routes/index.ts** - Updated to use `resolveController()` helper
- **All controllers** - Now extend `BaseController` and use `@injectable()` decorator

## Usage

### In Controllers

```typescript
import { injectable } from "tsyringe";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";

@injectable()
export class MyController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }

    myMethod = (req: Request, res: Response) => {
        // Access current user
        if (this.currentUser) {
            logger.info('Request from user', { email: this.currentUser.email });
        }

        // Require authentication
        const user = this.requireAuth();  // Throws if not authenticated
        
        // Check authentication status
        if (this.isAuthenticated) {
            // User is logged in
        }
    };
}
```

### In Routes

```typescript
import { resolveController } from "../utils/controller-resolver";
import { MyController } from "../controllers/my-controller";

app.get('/api/my-route', resolveController(MyController, 'myMethod'));
```

## Benefits

1. **Automatic User Context** - No need to manually extract from `req.session`
2. **Type Safety** - Full TypeScript support for user properties
3. **Testability** - Easy to mock `RequestContext` in tests
4. **Scalability** - Can inject additional services (database, cache, etc.)
5. **Clean Code** - Controllers focus on business logic, not infrastructure

## Migration Path

### Current State
- ✅ SearchController - Migrated to DI
- ✅ NavigationController - Migrated to DI
- ✅ ContentController - Migrated to DI
- ✅ ArchiveController - Migrated to DI
- ⚠️ AuthController - Kept as-is (manages sessions directly)
- ⚠️ IndexController - Kept as-is (simple controller)

### To Migrate a Controller

1. Add imports:
```typescript
import { injectable } from "tsyringe";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";
```

2. Add decorator and extend base:
```typescript
@injectable()
export class YourController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }
    
    // ... your methods
}
```

3. Use `this.currentUser` instead of `req.session.user`

4. Update route registration:
```typescript
app.get('/your-route', resolveController(YourController, 'yourMethod'));
```

## Testing

### Unit Testing Controllers

```typescript
import { RequestContext } from "../services/request-context.service";
import { MyController } from "./my-controller";

describe('MyController', () => {
    it('should access user context', () => {
        // Create mock context
        const mockContext = new RequestContext();
        mockContext.setUser({
            nameID: '123',
            email: 'test@example.com',
            // ...
        });

        // Instantiate controller with mock
        const controller = new MyController(mockContext);
        
        // Test methods
        expect(controller.currentUser?.email).toBe('test@example.com');
    });
});
```

## Future Enhancements

### Add More Services

```typescript
@injectable()
export class DatabaseService {
    async query(sql: string) { /* ... */ }
}

@injectable()
export class MyController extends BaseController {
    constructor(
        requestContext: RequestContext,
        private dbService: DatabaseService  // Auto-injected
    ) {
        super(requestContext);
    }
}
```

### Request-Scoped Services

```typescript
// In app.ts or middleware
container.register(DatabaseService, { useClass: DatabaseService }, { lifecycle: Lifecycle.ContainerScoped });
```

### Singleton Services

```typescript
@singleton()
export class ConfigService {
    // Shared across all requests
}
```

## Troubleshooting

### "Cannot read property 'container' of undefined"
- Ensure `requestContextMiddleware` is registered in app.ts
- Must come after session middleware, before routes

### "No matching bindings found"
- Add `@injectable()` decorator to the class
- Ensure class is imported properly

### "Metadata is not defined"
- Add `import 'reflect-metadata'` as first import in app.ts
- Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in tsconfig.json

## Dependencies

- **tsyringe**: ^4.8.0 - DI container
- **reflect-metadata**: ^0.2.0 - Required for decorator metadata

## License

Both TSyringe and reflect-metadata are MIT licensed, compatible with GPLv2.
