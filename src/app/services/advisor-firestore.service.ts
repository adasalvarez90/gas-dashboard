import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';
import * as _ from 'lodash';
import { map } from 'rxjs/operators';

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
		const q = query(ref, where('_on', '==', true));
		
		const snap = await getDocs(q);

		const advisors = snap.docs.map(d => d.data() as Advisor);

		// Sort advisors by level first 'CEO' then 'MAMANGER' AND LAST 'CONSULTANT' and then by _create date
		advisors.sort((a, b) => {
			const levelOrder = { 'CEO': 1, 'MANAGER': 2, 'CONSULTANT': 3 };
			if (levelOrder[a.hierarchyLevel] !== levelOrder[b.hierarchyLevel]) {
				return levelOrder[a.hierarchyLevel] - levelOrder[b.hierarchyLevel];
			}
			return (a._create || 0) - (b._create || 0);
		});

		return advisors;
	}

	// ➕ Create advisor
	async createAdvisor(advisor: Advisor): Promise<Advisor> {
		const uid = uuidv4();

		const newAdvisor: Advisor = {
			...advisor,
			uid,
			_create: Date.now(),
			_on: true,
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newAdvisor);

		return newAdvisor;
	}

	// ✏️ Update advisor
	async updateAdvisor(advisor: Advisor): Promise<Advisor> {
		let updateAdvisor = _.cloneDeep(advisor);
		
		updateAdvisor._update = Date.now();

		const ref = doc(this.firestore, this.collectionName, advisor.uid);
		await updateDoc(ref, { ...updateAdvisor });

		return updateAdvisor;
	}

	// 🗑️ Delete advisor
	async deleteAdvisor(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
