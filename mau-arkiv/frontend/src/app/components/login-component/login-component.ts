import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss'
})
export class LoginComponent implements OnInit {
  private returnUrl?: string;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get the returnUrl from query parameters
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'];
    });
  }

  login(): void {
    this.authService.login(this.returnUrl);
  }
}
