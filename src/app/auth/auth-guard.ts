import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UserRole } from '../firestore';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRole: UserRole | undefined = route.data['role']; // Get expected role from route data

  return authService.userProfile$.pipe(
    take(1),
    map(userProfile => {
      if (userProfile) {
        // If an expected role is defined, check if the user has that role
        if (expectedRole && userProfile.role !== expectedRole) {
          debugger
          alert('Access Denied: You do not have the required role.');
          router.navigate(['/login']); // Redirect to login or an unauthorized page
          return false;
        }
        return true; // User is authenticated and has the required role (or no role is expected)
      } else {
        router.navigate(['/login']); // User is not authenticated
        return false;
      }
    })
  );
};
