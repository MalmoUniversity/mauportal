import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Auth guard checking...', state.url);

  // First check the auth status from the server
  return authService.checkAuthStatus().pipe(
    map(isAuthenticated => {
      console.log('Auth guard result:', isAuthenticated);
      if (isAuthenticated) {
        return true;
      } else {
        console.log('Not authenticated, redirecting to login');
        // Store the intended URL for redirecting after login
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    })
  );
};
