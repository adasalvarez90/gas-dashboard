import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, User, onAuthStateChanged } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {

  constructor(private auth: Auth) {}

  // Email / Password login
  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return cred.user;
  }

  // Logout
  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  // Auth state observable
  authState$(): Observable<User | null> {
    return new Observable(subscriber => {
      const unsubscribe = onAuthStateChanged(this.auth, user => {
        subscriber.next(user);
      });
      return unsubscribe;
    });
  }
}
