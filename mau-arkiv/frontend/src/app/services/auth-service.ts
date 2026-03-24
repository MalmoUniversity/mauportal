import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  nameID: string;
  nameIDFormat: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  attributes?: any;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.api.url;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private authCheckComplete = false;

  constructor(private http: HttpClient) {
    // Don't call checkAuthStatus here - let the guard handle it
  }

  /**
   * Check if user is currently authenticated
   */
  checkAuthStatus(): Observable<boolean> {
    console.log('Checking auth status...');
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/me`, {
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('Auth response:', response);
        if (response.authenticated && response.user) {
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
          this.authCheckComplete = true;
          return true;
        }
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.authCheckComplete = true;
        return false;
      }),
      catchError(error => {
        console.error('Auth check failed:', error);
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.authCheckComplete = true;
        return of(false);
      })
    );
  }

  /**
   * Initiate SAML login
   */
  login(returnUrl?: string): void {
    const url = returnUrl 
      ? `${this.apiUrl}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : `${this.apiUrl}/auth/login`;
    window.location.href = url;
  }

  /**
   * Logout
   */
  logout(): void {
    window.location.href = `${this.apiUrl}/auth/logout`;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated (synchronous)
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}
