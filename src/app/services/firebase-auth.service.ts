import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {

  constructor(private auth: Auth) {}

  login(email: string, password: string): Promise<User> {
    return signInWithEmailAndPassword(this.auth, email, password)
      .then(cred => cred.user);
  }

   /** LOGIN CON GOOGLE */
  loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider)
      .then(cred => cred.user);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  authState$(): Observable<User | null> {
    return new Observable(subscriber => {
      const unsubscribe = onAuthStateChanged(this.auth, user => {
        subscriber.next(user);
      });
      return unsubscribe;
    });
  }
}
