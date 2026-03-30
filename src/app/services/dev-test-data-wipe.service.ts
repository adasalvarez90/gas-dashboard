import { Injectable } from '@angular/core';
import {
	Firestore,
	collection,
	getDocs,
	limit,
	query,
	writeBatch,
} from '@angular/fire/firestore';

/**
 * Borra todos los documentos de colecciones concretas (útil en entorno de pruebas).
 * Firestore no expone "drop collection" en el SDK web; se borra en lotes de hasta 500.
 */
@Injectable({ providedIn: 'root' })
export class DevTestDataWipeService {
	/** Orden: dependientes primero, contratos al final. */
	private readonly collectionOrder = [
		'commissionPayments',
		'commissionCutAdvisorStates',
		'deposits',
		'tranches',
		'contracts',
	] as const;

	constructor(private firestore: Firestore) {}

	async wipeContractsDepositsTranchesCommissionPayments(): Promise<
		{ name: string; deleted: number }[]
	> {
		const summary: { name: string; deleted: number }[] = [];
		for (const name of this.collectionOrder) {
			const deleted = await this.deleteAllDocumentsInCollection(name);
			summary.push({ name, deleted });
		}
		return summary;
	}

	private async deleteAllDocumentsInCollection(
		collectionName: string,
	): Promise<number> {
		let total = 0;
		const collRef = collection(this.firestore, collectionName);

		while (true) {
			const q = query(collRef, limit(500));
			const snap = await getDocs(q);
			if (snap.empty) {
				break;
			}
			const batch = writeBatch(this.firestore);
			for (const d of snap.docs) {
				batch.delete(d.ref);
			}
			await batch.commit();
			total += snap.size;
		}

		return total;
	}
}
