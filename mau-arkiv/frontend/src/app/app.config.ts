import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors, withFetch, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

/**
 * Initialize CSRF token on app startup by fetching it from backend
 */
export function initializeCSRFToken(http: HttpClient) {
  return () => http.get<{ token: string }>('/api/csrf-token', {
    withCredentials: true
  })
    .toPromise()
    .then(response => {
      if (response?.token) {
        sessionStorage.setItem('csrf-token', response.token);
        console.log('CSRF token initialized');
      }
    })
    .catch(error => {
      console.error('Failed to fetch CSRF token', error);
      // Continue app startup even if CSRF token fetch fails
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch(),
      withInterceptorsFromDi()
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeCSRFToken,
      deps: [HttpClient],
      multi: true
    }
  ]
};
