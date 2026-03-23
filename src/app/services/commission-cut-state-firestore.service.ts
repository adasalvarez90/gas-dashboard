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
import {
	getBreakdownDeadline,
	getNextCutDate,
} from '../domain/commission-cut/commission-cut-deadlines.util';
import { isAfterMexicoDate } from '../domain/time/mexico-time.util';

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

	/** Añade un motivo de atraso sin cambiar el estado. Crea el doc si no existe. */
	async addLateReason(
		cutDate: number,
		advisorUid: string,
		reasonCode: string
	): Promise<CommissionCutAdvisorState> {
		const existing = await this.getByCutAndAdvisor(cutDate, advisorUid);
		const reasons = existing?.lateReasons ?? [];
		if (reasons.includes(reasonCode)) return { ...existing!, lateReasons: reasons } as CommissionCutAdvisorState;
		const newReasons = [...reasons, reasonCode];
		return this.upsert({
			cutDate,
			advisorUid,
			state: existing?.state ?? 'PENDING',
			lateReasons: newReasons,
		});
	}

	/** Marca desglose enviado. Si ya pasó el plazo, añade lateReasons. */
	async markBreakdownSent(cutDate: number, advisorUid: string): Promise<CommissionCutAdvisorState> {
		const now = Date.now();
		const deadline = getBreakdownDeadline(cutDate);
		const wasLate = isAfterMexicoDate(now, deadline);
		const state = await this.upsert({
			cutDate,
			advisorUid,
			state: 'BREAKDOWN_SENT',
			breakdownSentAt: now,
		});
		if (wasLate) {
			return this.addLateReason(cutDate, advisorUid, 'DESGLOSE_NO_ENVIADO_A_TIEMPO');
		}
		return state;
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

	/** Marca pagada (comprobante recibido, con URL opcional). Si el estado fue diferido, setea paidLate. */
	async markPaid(
		cutDate: number,
		advisorUid: string,
		receiptUrl?: string
	): Promise<CommissionCutAdvisorState> {
		const now = Date.now();
		const existing = await this.getByCutAndAdvisor(cutDate, advisorUid);
		const wasDeferred = !!(existing?.movedToNextCut || existing?.originalCutDate);
		return this.upsert({
			cutDate,
			advisorUid,
			state: 'PAID',
			receiptSentAt: now,
			receiptUrl,
			...(wasDeferred && { paidLate: true }),
		});
	}

	/** Marca estado como diferido al siguiente corte. NO mueve el doc; actualiza en el corte original. */
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
			movedToNextCut: true,
			originalCutDate: cutDate,
			deferredToCutDate: nextCutDate,
			_update: Date.now(),
		} as Record<string, unknown>);
	}
}
