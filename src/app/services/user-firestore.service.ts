import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { User } from 'src/app/store/user/user.model';

@Injectable({ providedIn: 'root' })
export class UserFirestoreService {
	constructor(private firestore: Firestore) { }

	// 🔍 Get single user
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

	// 🔎 Load users
	async getUsersByRole(currentUser: User): Promise<User[]> {
		const usersRef = collection(this.firestore, 'users');
		const querySnapshot = await getDocs(usersRef);
		const users: User[] = [];
		querySnapshot.forEach((docSnap) => {
			const userData = docSnap.data() as User;
			// Filtrar usuarios según rol del usuario actual
			if (userData._on !== false) {
				// Solo incluir usuarios activos
				if (currentUser.role === 0) {
					// DEV ve todos
					users.push(userData);
				} else {
					// ADMIN ve ADMIN y USER
					if (userData.role !== 0) {
						users.push(userData);
					}
				}
			}
		});
		return users;
	}

	// ➕ Create user
	async createUser(user: User): Promise<void> {
		const ref = doc(this.firestore, `users/${user.uid}`);
		await updateDoc(ref, { ...user });
	}

	// ✏️ Update user
	async updateUser(user: User): Promise<void> {
		const ref = doc(this.firestore, `users/${user.uid}`);
		await updateDoc(ref, { ...user });
	}

	// 🗑️ Delete user
	async deleteUser(uid: string): Promise<void> {
		const ref = doc(this.firestore, `users/${uid}`);
		await updateDoc(ref, { _on: false });
	}
}
