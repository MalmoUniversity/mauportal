import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth-service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header-component',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  templateUrl: './header-component.html',
  styleUrl: './header-component.scss'
})
export class HeaderComponent {
  currentUser$: Observable<User | null>;
  isAuthenticated$: Observable<boolean>;
  version = environment.version;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  logout(): void {
    this.authService.logout();
  }
}
