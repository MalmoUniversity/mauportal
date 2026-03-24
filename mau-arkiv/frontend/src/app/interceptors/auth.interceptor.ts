import { HttpInterceptorFn } from '@angular/common/http';

/**
 * HTTP Interceptor to include credentials (cookies) with all requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedRequest = req.clone({
    withCredentials: true // CRITICAL: Include credentials with every request
  });
  return next(clonedRequest);
};
