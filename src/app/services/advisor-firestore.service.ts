import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc } from '@angular/fire/firestore';
import { Advisor } from 'src/app/store/advisor/advisor.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ 
	providedIn: 'root'
})
export class AdvisorFirestoreService {

	private readonly collectionName = 'advisors';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getAdvisors(): Promise<Advisor[]> {
		const ref = collection(this.firestore, this.collectionName);
		const snap = await getDocs(ref);

		return snap.docs.map(d => d.data() as Advisor);
	}

	// ➕ Create advisor
	async createAdvisor(advisor: Advisor): Promise<Advisor> {
		const uid = uuidv4();

		const newAdvisor: Advisor = {
			uid,
			name: advisor.name,
			_create: Date.now(),
			_on: true,
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newAdvisor);

		return newAdvisor;
	}

	// ✏️ Update advisor
	async updateAdvisor(advisor: Advisor): Promise<void> {
		advisor._update = Date.now();
		const ref = doc(this.firestore, this.collectionName, advisor.uid);
		await updateDoc(ref, { ...advisor });
	}

	// 🗑️ Delete advisor
	async deleteAdvisor(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
