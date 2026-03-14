import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, User, setPersistence, browserLocalPersistence } from '@angular/fire/auth';
import { Observable, BehaviorSubject, firstValueFrom } from 'rxjs'; // Import firstValueFrom
import { switchMap } from 'rxjs/operators';
import { FirestoreService, UserProfile } from '../firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _user = new BehaviorSubject<User | null>(null);
  user$: Observable<User | null> = this._user.asObservable();
  userProfile$: Observable<UserProfile | null>;

  constructor(private auth: Auth, private firestoreService: FirestoreService) {
    console.log('AuthService constructor called.');
    this.auth.onAuthStateChanged(user => {
      console.log('onAuthStateChanged event:', user ? user.uid : 'No user');
      this._user.next(user);
    });

    this.userProfile$ = this.user$.pipe(
      switchMap(user => {
        if (user) {
          console.log('Fetching user profile for UID:', user.uid);
          return this.firestoreService.getUserProfile(user.uid);
        } else {
          console.log('No user, returning null user profile.');
          return new Observable<UserProfile | null>(observer => observer.next(null));
        }
      })
    );
  }

  async login(email: string, password: string): Promise<User | null> {
    try {
      // Set persistence BEFORE signing in
      await setPersistence(this.auth, browserLocalPersistence); // Explicitly set local persistence

      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      if (user) {
        // Check if user profile exists, if not, create a default one
        const userProfile = await firstValueFrom(this.firestoreService.getUserProfile(user.uid)); // Use firstValueFrom

        if (!userProfile) {
          // Default role for new sign-ins is 'agent' if no profile exists
          await this.firestoreService.createUserProfile(user.uid, user.email || '', 'agent');
        }
      }
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }
  getUserProfile(uid: string): Observable<any> {
    return this.firestoreService.getUserProfile(uid);
  }
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }
}
