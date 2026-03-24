# SAML2 Authentication Setup

## Overview

This application uses SAML2 for single sign-on (SSO) authentication with SimpleSAMLphp as the Identity Provider (IdP).

## Configuration

### Backend Configuration

The SAML configuration is stored in `backend/config/local.json`:

```json
{
  "saml": {
    "entryPoint": "http://192.168.1.231:8080/simplesaml/saml2/idp/SSOService.php",
    "issuer": "mau-arkiv-sp",
    "callbackUrl": "http://localhost:3000/api/auth/saml/callback",
    "identifierFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "metadataUrl": "http://192.168.1.231:8080/simplesaml/saml2/idp/metadata.php",
    "signatureAlgorithm": "sha256",
    "sessionSecret": "your-secret-key-change-in-production"
  }
}
```

### Important Notes

1. **Session Secret**: Change `sessionSecret` in production to a strong, random string
2. **Certificates**: The current implementation uses placeholder certificates. For production:
   - Generate proper RSA key pairs
   - Store them securely (environment variables or secure file system)
   - Update `saml-config.ts` to load them properly

## API Endpoints

### Authentication Endpoints

- **GET `/api/auth/login`** - Initiates SAML login flow
- **POST `/api/auth/saml/callback`** - Handles SAML response from IdP
- **GET `/api/auth/me`** - Returns current user information
- **GET `/api/auth/logout`** - Logs out user and redirects to IdP logout
- **GET `/api/auth/metadata`** - Returns SP metadata XML

## Frontend Integration

### Auth Service

The `AuthService` provides:
- `login()` - Redirects to SAML login
- `logout()` - Logs out and redirects to IdP
- `isAuthenticated$` - Observable of authentication status
- `currentUser$` - Observable of current user
- `checkAuthStatus()` - Checks current authentication status

### Auth Guard

Routes can be protected using the `authGuard`:

```typescript
{
  path: 'protected',
  component: ProtectedComponent,
  canActivate: [authGuard]
}
```

### Usage in Components

```typescript
import { AuthService } from './services/auth-service';

export class MyComponent {
  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      console.log('Current user:', user);
    });
  }

  login() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
  }
}
```

## SimpleSAMLphp IdP Configuration

To configure the MAU Arkiv application in SimpleSAMLphp:

1. Access your SimpleSAMLphp IdP metadata at:
   `http://192.168.1.231:8080/simplesaml/saml2/idp/metadata.php`

2. Add the MAU Arkiv SP to your IdP's `metadata/saml20-sp-remote.php`:

```php
$metadata['mau-arkiv-sp'] = array(
    'AssertionConsumerService' => 'http://localhost:3000/api/auth/saml/callback',
    'SingleLogoutService' => 'http://localhost:3000/api/auth/saml/logout',
    'NameIDFormat' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
);
```

3. Configure attribute mapping to ensure the following attributes are sent:
   - `email` or `mail`
   - `displayName` or `cn`
   - `givenName`
   - `sn` (surname)

## Session Management

Sessions are stored server-side using `express-session` with the following configuration:
- **Duration**: 24 hours
- **Secure**: Only in production (HTTPS required)
- **HttpOnly**: Yes (prevents XSS attacks)
- **SameSite**: Default (provides CSRF protection)

## Security Considerations

### Production Checklist

- [ ] Generate and store proper RSA certificates
- [ ] Use strong, random session secret
- [ ] Enable HTTPS for all connections
- [ ] Configure proper CORS origins (not `*`)
- [ ] Set `secure: true` for cookies in production
- [ ] Implement proper session storage (Redis, database)
- [ ] Add rate limiting for authentication endpoints
- [ ] Implement CSRF protection
- [ ] Configure proper certificate validation
- [ ] Set up monitoring for failed authentication attempts

### HTTPS Configuration

For production, ensure:
1. SSL/TLS certificates are properly configured
2. All URLs use `https://` instead of `http://`
3. Update SAML configuration to use HTTPS endpoints
4. Enable secure cookies: `cookie.secure = true`

## Troubleshooting

### Common Issues

1. **"SAML authentication failed"**
   - Check IdP metadata is accessible
   - Verify SP entity ID matches IdP configuration
   - Check callback URL is correct

2. **"Session not persisting"**
   - Verify CORS is configured with `credentials: true`
   - Check frontend uses `withCredentials` in HTTP requests
   - Ensure same domain for frontend and backend (or proper CORS setup)

3. **"Certificate errors"**
   - Generate proper certificates for production
   - Ensure certificates are in correct PEM format
   - Verify certificate paths and permissions

### Debug Mode

Enable debug logging in `backend/src/config/saml-config.ts` to see detailed SAML flow:

```typescript
logger.info('SAML Debug', { /* debug info */ });
```

## Development vs Production

### Development
- Uses HTTP (localhost)
- Simple session storage (memory)
- Placeholder certificates
- CORS allows all origins from localhost:4200

### Production
- **Must** use HTTPS
- Use secure session storage (Redis/Database)
- Proper RSA certificates
- Restricted CORS origins
- Secure cookies enabled

## User Attributes

The following user attributes are extracted from SAML response:

```typescript
{
  nameID: string;           // User's unique identifier
  nameIDFormat: string;     // Format of the nameID
  email?: string;           // User's email address
  displayName?: string;     // Display name
  firstName?: string;       // Given name
  lastName?: string;        // Surname
  attributes?: any;         // All SAML attributes
}
```

Attributes can be customized by modifying `backend/src/config/saml-config.ts`.
