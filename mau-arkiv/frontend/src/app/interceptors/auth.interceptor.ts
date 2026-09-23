import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * HTTP Interceptor to:
 * 1. Include credentials (cookies) with all requests
 * 2. Include CSRF token for state-changing requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);

  // Add credentials to all requests
  let clonedRequest = req.clone({
    withCredentials: true // CRITICAL: Include credentials with every request
  });

  // Add CSRF token for state-changing methods (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = sessionStorage.getItem('csrf-token');
    if (token) {
      clonedRequest = clonedRequest.clone({
        setHeaders: {
          'X-CSRF-Token': token
        }
      });
    }
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // If CSRF token expired (403), fetch a new one and retry
      if (error.status === 403 && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
        return http.get<{ token: string }>('/api/csrf-token', {
          withCredentials: true
        }).pipe(
          switchMap(response => {
            sessionStorage.setItem('csrf-token', response.token);
            const retryRequest = clonedRequest.clone({
              setHeaders: {
                'X-CSRF-Token': response.token
              }
            });
            return next(retryRequest);
          }),
          catchError(() => {
            // If token refresh fails, return original error
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
