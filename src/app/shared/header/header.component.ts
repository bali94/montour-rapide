import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UserProfile } from '../../firestore';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  currentUser = signal<UserProfile | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.userProfile$.subscribe(userProfile => {
      this.currentUser.set(userProfile);
    });
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Erreur lors de la déconnexion.");
    }
  }
}
