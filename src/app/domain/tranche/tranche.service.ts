import { Injectable } from '@angular/core';
import { TrancheFirestoreService } from 'src/app/services/tranche-firestore.service';

@Injectable({ providedIn: 'root' })
export class TrancheService {

	constructor(
		private trancheFS: TrancheFirestoreService
	) {}

	async createTranche(contractUid: string, amount: number, registeredAt?: number) {

		if (amount <= 0) {
			throw new Error('El monto del tramo debe ser mayor a 0');
		}

		const tranches = await this.trancheFS.getTranches(contractUid);

		if (tranches.length) {

			const last = tranches
				.sort((a, b) => b.sequence - a.sequence)[0];

			if (!last.funded) {
				throw new Error(
					'No puedes crear un nuevo tramo hasta que el anterior esté fondeado al 100%'
				);
			}
		}

		return this.trancheFS.createTranche(contractUid, amount, registeredAt);
	}
}
