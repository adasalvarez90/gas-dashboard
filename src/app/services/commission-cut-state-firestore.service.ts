import { Injectable } from '@angular/core';
import {
	Firestore,
	collection,
	getDocs,
	doc,
	setDoc,
	updateDoc,
	query,
	where,
} from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { CommissionCutAdvisorState } from '../models/commission-cut-state.model';
import { getNextCutDate } from '../domain/commission-cut/commission-cut-deadlines.util';

@Injectable({ providedIn: 'root' })
export class CommissionCutStateFirestoreService {
	private readonly collectionName = 'commissionCutAdvisorStates';

	constructor(private firestore: Firestore) {}

	/** Obtiene todos los estados en un rango de cutDate */
	async getByCutDateRange(
		startCutDate: number,
		endCutDate: number
	): Promise<CommissionCutAdvisorState[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '>=', startCutDate),
			where('cutDate', '<=', endCutDate),
			where('_on', '==', true)
		);
		const snap = await getDocs(q);
		return snap.docs.map((d) => d.data() as CommissionCutAdvisorState);
	}

	/** Obtiene el estado para un corte+asesora específico */
	async getByCutAndAdvisor(
		cutDate: number,
		advisorUid: string
	): Promise<CommissionCutAdvisorState | null> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cutDate),
			where('advisorUid', '==', advisorUid),
			where('_on', '==', true)
		);
		const snap = await getDocs(q);
		if (snap.empty) return null;
		return snap.docs[0].data() as CommissionCutAdvisorState;
	}

	/** Crea o actualiza el estado (upsert por cutDate+advisorUid) */
	async upsert(state: Partial<CommissionCutAdvisorState> & { cutDate: number; advisorUid: string }): Promise<CommissionCutAdvisorState> {
		const existing = await this.getByCutAndAdvisor(state.cutDate, state.advisorUid);
		const now = Date.now();

		if (existing) {
			const ref = doc(this.firestore, this.collectionName, existing.uid);
			const updates: Record<string, unknown> = {
				...state,
				_update: now,
			};
			await updateDoc(ref, updates as Record<string, unknown>);
			return { ...existing, ...state, _update: now } as CommissionCutAdvisorState;
		} else {
			const uid = state.uid ?? uuidv4();
			const ref = doc(this.firestore, this.collectionName, uid);
			const newState: CommissionCutAdvisorState = {
				uid,
				cutDate: state.cutDate,
				advisorUid: state.advisorUid,
				state: state.state ?? 'PENDING',
				_on: true,
				_create: now,
				_update: now,
				...state,
			};
			await setDoc(ref, newState as unknown as Record<string, unknown>);
			return newState;
		}
	}

	/** Marca desglose enviado */
	async markBreakdownSent(cutDate: number, advisorUid: string): Promise<CommissionCutAdvisorState> {
		const now = Date.now();
		return this.upsert({
			cutDate,
			advisorUid,
			state: 'BREAKDOWN_SENT',
			breakdownSentAt: now,
		});
	}

	/** Marca factura enviada (con URL opcional) */
	async markInvoiceSent(
		cutDate: number,
		advisorUid: string,
		invoiceUrl?: string
	): Promise<CommissionCutAdvisorState> {
		const now = Date.now();
		return this.upsert({
			cutDate,
			advisorUid,
			state: 'SENT_TO_PAYMENT',
			invoiceSentAt: now,
			invoiceUrl,
		});
	}

	/** Marca pagada (comprobante recibido, con URL opcional) */
	async markPaid(
		cutDate: number,
		advisorUid: string,
		receiptUrl?: string
	): Promise<CommissionCutAdvisorState> {
		const now = Date.now();
		return this.upsert({
			cutDate,
			advisorUid,
			state: 'PAID',
			receiptSentAt: now,
			receiptUrl,
		});
	}

	/** Mueve estado al siguiente corte (regla factura tardía) */
	async moveStateToNextCut(cutDate: number, advisorUid: string): Promise<void> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cutDate),
			where('advisorUid', '==', advisorUid),
			where('_on', '==', true)
		);
		const snap = await getDocs(q);
		if (snap.empty) return;
		const docRef = doc(this.firestore, this.collectionName, snap.docs[0].id);
		const nextCutDate = getNextCutDate(cutDate);
		await updateDoc(docRef, {
			cutDate: nextCutDate,
			movedToNextCut: true,
			_update: Date.now(),
		} as Record<string, unknown>);
	}
}
