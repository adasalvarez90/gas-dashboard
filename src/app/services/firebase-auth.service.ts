import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirebaseAuthService {
  constructor(private auth: Auth, private firestore: Firestore) {}

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    await this.saveUserToFirestore(cred.user);
    return cred.user;
  }

  /** LOGIN CON GOOGLE */
  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    await this.saveUserToFirestore(cred.user);
    return cred.user;
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  authState$(): Observable<User | null> {
    return new Observable((subscriber) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        subscriber.next(user);
      });
      return unsubscribe;
    });
  }

  // 💾 GUARDAR USUARIO EN FIRESTORE
  private async saveUserToFirestore(user: User) {
    const userRef = doc(this.firestore, 'users', user.uid);

    const newUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      provider: user.providerData[0]?.providerId || 'password',
      role: 'user',
      createdAt: new Date(),
    };

    await setDoc(userRef, newUser, { merge: true });
  }
}
