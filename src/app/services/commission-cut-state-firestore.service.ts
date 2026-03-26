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
	type LateReasonEntry,
	type LateReasonStep,
	normalizeLateReasons,
} from '../models/commission-cut-late-reason.model';
import {
	getBreakdownDeadline,
	getInvoiceDeadline,
	getNextCutDate,
	getPaymentDeadline,
	isInvoiceLate,
} from '../domain/commission-cut/commission-cut-deadlines.util';
import { isAfterMexicoDate } from '../domain/time/mexico-time.util';

@Injectable({ providedIn: 'root' })
export class CommissionCutStateFirestoreService {
	private readonly collectionName = 'commissionCutAdvisorStates';

	constructor(private firestore: Firestore) {}

	/** Todos los estados activos (misma cobertura que comisiones en Cortes de comisión). */
	async getAllActive(): Promise<CommissionCutAdvisorState[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('_on', '==', true));
		const snap = await getDocs(q);
		return snap.docs.map((d) => d.data() as CommissionCutAdvisorState);
	}

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

	/** Quita motivos previos de ese paso y guarda uno nuevo (p. ej. sustituye el automático por el del usuario). */
	async replaceLateReasonForStep(
		cutDate: number,
		advisorUid: string,
		step: LateReasonStep,
		entry: LateReasonEntry
	): Promise<CommissionCutAdvisorState> {
		const existing = await this.getByCutAndAdvisor(cutDate, advisorUid);
		const reasons = normalizeLateReasons(existing?.lateReasons);
		const filtered = reasons.filter((r) => r.step !== step);
		const merged: LateReasonEntry = { ...entry, step, at: Date.now() };
		const newReasons = [...filtered, merged];
		return this.upsert({
			cutDate,
			advisorUid,
			state: existing?.state ?? 'PENDING',
			lateReasons: newReasons,
		});
	}

	/** Añade un motivo de atraso con step, reason (catálogo) y texto opcional. Crea el doc si no existe. */
	async addLateReason(
		cutDate: number,
		advisorUid: string,
		entry: LateReasonEntry
	): Promise<CommissionCutAdvisorState> {
		const existing = await this.getByCutAndAdvisor(cutDate, advisorUid);
		const reasons = existing?.lateReasons ?? [];
		const newEntry: LateReasonEntry = { ...entry, at: entry.at ?? Date.now() };
		const alreadyHas = reasons.some((r) => r.step === newEntry.step && r.reason === newEntry.reason);
		if (alreadyHas) return { ...existing!, lateReasons: reasons } as CommissionCutAdvisorState;
		const newReasons = [...reasons, newEntry];
		return this.upsert({
			cutDate,
			advisorUid,
			state: existing?.state ?? 'PENDING',
			lateReasons: newReasons,
		});
	}

	/** Marca informe de cálculo / desglose enviado. `breakdownSentAt` = fecha declarada del paso. */
	async markBreakdownSent(
		cutDate: number,
		advisorUid: string,
		opts?: { breakdownSentAt?: number; lateEntry?: LateReasonEntry }
	): Promise<CommissionCutAdvisorState> {
		const at = opts?.breakdownSentAt ?? Date.now();
		const state = await this.upsert({
			cutDate,
			advisorUid,
			state: 'BREAKDOWN_SENT',
			breakdownSentAt: at,
		});
		if (opts?.lateEntry) {
			return this.replaceLateReasonForStep(cutDate, advisorUid, 'DESGLOSE', opts.lateEntry);
		}
		return state;
	}

	/** Marca factura enviada. `invoiceSentAt` = fecha declarada. Si factura tardía, mueve al siguiente corte (lógica en la página). */
	async markInvoiceSent(
		cutDate: number,
		advisorUid: string,
		invoiceUrl?: string,
		lateEntry?: LateReasonEntry,
		invoiceSentAt?: number
	): Promise<CommissionCutAdvisorState> {
		const at = invoiceSentAt ?? Date.now();
		const state = await this.upsert({
			cutDate,
			advisorUid,
			state: 'SENT_TO_PAYMENT',
			invoiceSentAt: at,
			invoiceUrl,
		});
		if (lateEntry) {
			return this.replaceLateReasonForStep(cutDate, advisorUid, 'FACTURA', { ...lateEntry, step: 'FACTURA' });
		}
		return state;
	}

	/** Marca pagada. `paidLate` si hubo diferido, motivo de atraso, o cualquier paso del flujo fuera de plazo (por fechas). */
	async markPaid(
		cutDate: number,
		advisorUid: string,
		receiptUrl?: string,
		lateEntry?: LateReasonEntry,
		receiptSentAt?: number
	): Promise<CommissionCutAdvisorState> {
		const at = receiptSentAt ?? Date.now();
		const existing = await this.getByCutAndAdvisor(cutDate, advisorUid);
		const wasDeferred = !!(existing?.movedToNextCut || existing?.originalCutDate);
		const breakdownDl = getBreakdownDeadline(cutDate);
		const wasBreakdownLate = !!(
			existing?.breakdownSentAt && isAfterMexicoDate(existing.breakdownSentAt, breakdownDl)
		);
		const invoiceDlForCheck = existing?.breakdownSentAt
			? getInvoiceDeadline(existing.breakdownSentAt)
			: breakdownDl;
		const wasInvoiceLate = !!(
			existing?.invoiceSentAt && isInvoiceLate(existing.invoiceSentAt, invoiceDlForCheck)
		);
		const paymentDl = existing?.invoiceSentAt ? getPaymentDeadline(existing.invoiceSentAt) : undefined;
		const wasPaymentLate = paymentDl ? isAfterMexicoDate(at, paymentDl) : false;
		const paidLate =
			wasDeferred || !!lateEntry || wasBreakdownLate || wasInvoiceLate || wasPaymentLate;
		const state = await this.upsert({
			cutDate,
			advisorUid,
			state: 'PAID',
			receiptSentAt: at,
			receiptUrl,
			paidLate,
		});
		if (lateEntry) {
			return this.replaceLateReasonForStep(cutDate, advisorUid, 'PAGO', { ...lateEntry, step: 'PAGO' });
		}
		return state;
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
