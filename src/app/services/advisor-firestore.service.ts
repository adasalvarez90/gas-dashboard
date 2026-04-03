import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, getDoc, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';
import * as _ from 'lodash';
import { map } from 'rxjs/operators';

import { Advisor } from 'src/app/store/advisor/advisor.model';
import type { Contract } from 'src/app/store/contract/contract.model';
import { collectParticipantAdvisorUidsFromRoles } from 'src/app/domain/contract/collect-participant-advisor-uids.util';
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

		const advisors = snap.docs
			.map(d => d.data() as Advisor)
			.filter(a => !a.archived);

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

	/** Lectura por UID (incluye archivados / legado) para huellas en contratos. */
	async getAdvisorByUid(uid: string): Promise<Advisor | null> {
		if (!uid?.trim()) return null;
		const ref = doc(this.firestore, this.collectionName, uid);
		const s = await getDoc(ref);
		if (!s.exists()) return null;
		return s.data() as Advisor;
	}

	/**
	 * Asesores activos en listas + los referenciados en `roles` que estén archivados u omitidos del catálogo activo.
	 */
	async mergeActiveWithArchivedForContractRoles(roles: Contract['roles'] | undefined): Promise<Advisor[]> {
		const active = await this.getAdvisors();
		const uids = collectParticipantAdvisorUidsFromRoles(roles);
		if (uids.length === 0) return active;
		const byUid = new Map(active.map(a => [a.uid, a]));
		const extras: Advisor[] = [];
		for (const uid of uids) {
			if (byUid.has(uid)) continue;
			const a = await this.getAdvisorByUid(uid);
			if (a) extras.push(a);
		}
		return [...active, ...extras];
	}

	// ➕ Create advisor
	async createAdvisor(advisor: Advisor): Promise<Advisor> {
		const uid = uuidv4();

		const newAdvisor: Advisor = {
			...advisor,
			uid,
			_create: Date.now(),
			_on: true,
			archived: false,
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

	// 🗑️ Archivar asesor (sigue en Firestore para contratos / histórico; no aparece en listas activas)
	async deleteAdvisor(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { archived: true, _update: Date.now() } as Record<string, unknown>);
	}
}
