import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { User } from 'src/app/store/user/user.model';

@Injectable({ providedIn: 'root' })
export class UserFirestoreService {
  constructor(private firestore: Firestore) {}

  /** Obtener usuario desde Firestore */
  async getUser(uid: string): Promise<Partial<User> | null> {
    try {
      const ref = doc(this.firestore, `users/${uid}`);
      const snap = await getDoc(ref);

      if (!snap.exists()) return null;
      return snap.data() as Partial<User>;
    } catch (error: any) {
      console.warn('Firestore access denied or user not found:', error);
      return null; // Treat as "user not registered"
    }
  }
}
