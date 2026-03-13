import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  email = signal<string>('');
  password = signal<string>('');
  errorMessage = signal<string | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  async login() {
    this.errorMessage.set(null);
    try {
      const user = await this.authService.login(this.email(), this.password());
      if (user) {
        // Redirect to cashier page on successful login
        this.router.navigate(['/caisse']);
      }
    } catch (error: any) {
      this.errorMessage.set(error.message);
      console.error("Login error:", error);
    }
  }
}
