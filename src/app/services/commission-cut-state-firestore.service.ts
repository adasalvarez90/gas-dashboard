import { Injectable } from '@angular/core';
import {
	type DocumentData,
	Firestore,
	collection,
	getDocs,
	doc,
	setDoc,
	updateDoc,
	query,
	where,
	writeBatch,
} from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { CommissionCutAdvisorState, type CommissionCutState } from '../models/commission-cut-state.model';
import { type LateReasonEntry, normalizeLateReasons } from '../models/commission-cut-late-reason.model';
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

	private docRef(uid: string) {
		return doc(this.firestore, this.collectionName, uid);
	}

	private coerceFirestoreMillis(v: unknown): number | undefined {
		if (v == null) return undefined;
		if (typeof v === 'number' && Number.isFinite(v)) return v;
		if (typeof v === 'object' && v !== null && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
			const m = (v as { toMillis: () => number }).toMillis();
			return Number.isFinite(m) ? m : undefined;
		}
		if (typeof v === 'object' && v !== null && 'seconds' in v) {
			const s = (v as { seconds: number }).seconds;
			const ns = (v as { nanoseconds?: number }).nanoseconds ?? 0;
			if (typeof s === 'number' && Number.isFinite(s)) return s * 1000 + Math.floor(ns / 1e6);
		}
		return undefined;
	}

	private stripUndefinedFields(obj: Record<string, unknown>): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(obj)) {
			const v = obj[key];
			if (v !== undefined) out[key] = v;
		}
		return out;
	}

	private mapDocFromFirestore(data: DocumentData): CommissionCutAdvisorState | null {
		const d = data as Record<string, unknown>;
		const cutDate = this.coerceFirestoreMillis(d['cutDate']);
		if (cutDate == null) return null;
		const base = { ...data } as CommissionCutAdvisorState;
		base.cutDate = cutDate;
		const tsKeys = [
			'breakdownSentAt',
			'invoiceDeadline',
			'invoiceSentAt',
			'paymentDeadline',
			'receiptSentAt',
			'originalCutDate',
			'deferredToCutDate',
			'_create',
			'_update',
		] as const;
		for (const k of tsKeys) {
			if (d[k] == null) continue;
			const v = this.coerceFirestoreMillis(d[k]);
			if (v != null) (base as unknown as Record<string, number>)[k] = v;
		}
		if (Array.isArray(base.lateReasons)) {
			base.lateReasons = base.lateReasons.map((e) => {
				const at = this.coerceFirestoreMillis((e as { at?: unknown }).at);
				return at != null ? { ...e, at } : e;
			});
		}
		return base;
	}

	private sanitizeLateReasonEntry(entry: LateReasonEntry): LateReasonEntry {
		const out: LateReasonEntry = {
			step: entry.step,
			reason: entry.reason,
			at: entry.at,
		};
		const text = entry.text?.trim();
		if (text) out.text = text;
		return out;
	}

	/**
	 * Varios docs con el mismo `cutDate`+`advisorUid` hacían que `stateMap` (último gana) mostrara PENDING
	 * aunque otro doc ya estuviera en BREAKDOWN_SENT. Una fila por par; gana el flujo más avanzado y `_update` más reciente.
	 */
	private dedupeByCutAndAdvisor(states: CommissionCutAdvisorState[]): CommissionCutAdvisorState[] {
		const rank: Record<CommissionCutState, number> = {
			PENDING: 0,
			BREAKDOWN_SENT: 1,
			SENT_TO_PAYMENT: 2,
			PAID: 3,
		};
		const score = (s: CommissionCutAdvisorState) =>
			(rank[s.state] ?? 0) * 1e15 + (typeof s._update === 'number' ? s._update : 0);
		const m = new Map<string, CommissionCutAdvisorState>();
		for (const s of states) {
			const key = `${s.cutDate}::${s.advisorUid}`;
			const prev = m.get(key);
			if (!prev || score(s) > score(prev)) m.set(key, s);
		}
		return Array.from(m.values());
	}

	/** Para la página al fusionar en memoria. */
	dedupeStates(states: CommissionCutAdvisorState[]): CommissionCutAdvisorState[] {
		return this.dedupeByCutAndAdvisor(states);
	}

	async getAllActive(): Promise<CommissionCutAdvisorState[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('_on', '==', true));
		const snap = await getDocs(q);
		const list = snap.docs
			.map((docSnap) => this.mapDocFromFirestore(docSnap.data()))
			.filter((s): s is CommissionCutAdvisorState => s != null);
		return this.dedupeByCutAndAdvisor(list);
	}

	async getByCutDateRange(startCutDate: number, endCutDate: number): Promise<CommissionCutAdvisorState[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '>=', startCutDate),
			where('cutDate', '<=', endCutDate),
			where('_on', '==', true)
		);
		const snap = await getDocs(q);
		const list = snap.docs
			.map((docSnap) => this.mapDocFromFirestore(docSnap.data()))
			.filter((s): s is CommissionCutAdvisorState => s != null);
		return this.dedupeByCutAndAdvisor(list);
	}

	async getByCutAndAdvisor(cutDate: number, advisorUid: string): Promise<CommissionCutAdvisorState | null> {
		const cd = this.coerceFirestoreMillis(cutDate) ?? cutDate;
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cd),
			where('advisorUid', '==', advisorUid),
			where('_on', '==', true)
		);
		const snap = await getDocs(q);
		if (snap.empty) return null;
		const list = snap.docs
			.map((docSnap) => this.mapDocFromFirestore(docSnap.data()))
			.filter((s): s is CommissionCutAdvisorState => s != null);
		const one = this.dedupeByCutAndAdvisor(list);
		return one[0] ?? null;
	}

	/**
	 * Upsert genérico (p. ej. proceso diferidas). Solo envía campos definidos; en update no inventa `state`.
	 */
	async upsert(state: Partial<CommissionCutAdvisorState> & { cutDate: number; advisorUid: string }): Promise<CommissionCutAdvisorState> {
		const cd = this.coerceFirestoreMillis(state.cutDate) ?? state.cutDate;
		if (typeof cd !== 'number' || !Number.isFinite(cd)) {
			throw new Error('commissionCutAdvisorStates.upsert: invalid cutDate');
		}
		const existing = await this.getByCutAndAdvisor(cd, state.advisorUid);
		const now = Date.now();
		if (existing) {
			const updates = this.stripUndefinedFields({
				...state,
				cutDate: cd,
				_update: now,
			}) as Record<string, unknown>;
			delete updates['uid'];
			await updateDoc(this.docRef(existing.uid), updates);
			return { ...existing, ...updates } as CommissionCutAdvisorState;
		}
		const uid = state.uid ?? uuidv4();
		const newState: CommissionCutAdvisorState = {
			...state,
			uid,
			cutDate: cd,
			advisorUid: state.advisorUid,
			state: state.state ?? 'PENDING',
			_on: true,
			_create: now,
			_update: now,
		};
		await setDoc(
			this.docRef(uid),
			this.stripUndefinedFields(newState as unknown as Record<string, unknown>) as Record<string, unknown>
		);
		return newState;
	}

	/** Solo añade a `lateReasons`; nunca modifica `state` en docs existentes. */
	async addLateReason(cutDate: number, advisorUid: string, entry: LateReasonEntry): Promise<CommissionCutAdvisorState> {
		const cd = this.coerceFirestoreMillis(cutDate) ?? cutDate;
		const ex = await this.getByCutAndAdvisor(cd, advisorUid);
		const newEntry = this.sanitizeLateReasonEntry({ ...entry, at: entry.at ?? Date.now() });
		const now = Date.now();
		if (ex) {
			const reasons = [...normalizeLateReasons(ex.lateReasons)];
			if (reasons.some((r) => r.step === newEntry.step && r.reason === newEntry.reason)) {
				return { ...ex, lateReasons: reasons } as CommissionCutAdvisorState;
			}
			reasons.push(newEntry);
			await updateDoc(this.docRef(ex.uid), { lateReasons: reasons, _update: now });
			return { ...ex, lateReasons: reasons, _update: now } as CommissionCutAdvisorState;
		}
		const uid = uuidv4();
		const docData = {
			uid,
			cutDate: cd,
			advisorUid,
			state: 'PENDING',
			lateReasons: [newEntry],
			_on: true,
			_create: now,
			_update: now,
		};
		await setDoc(this.docRef(uid), docData);
		return docData as CommissionCutAdvisorState;
	}

	/** Desglose descargado / informe enviado → BREAKDOWN_SENT. */
	async markBreakdownSent(
		cutDate: number,
		advisorUid: string,
		opts?: { breakdownSentAt?: number; lateEntry?: LateReasonEntry }
	): Promise<CommissionCutAdvisorState> {
		const cd = this.coerceFirestoreMillis(cutDate) ?? cutDate;
		const at = opts?.breakdownSentAt ?? Date.now();
		const now = Date.now();
		const ex = await this.getByCutAndAdvisor(cd, advisorUid);

		let lateReasons: LateReasonEntry[] | undefined;
		if (opts?.lateEntry) {
			lateReasons = normalizeLateReasons(ex?.lateReasons).filter((r) => r.step !== 'DESGLOSE');
			lateReasons.push(this.sanitizeLateReasonEntry({ ...opts.lateEntry, step: 'DESGLOSE', at: Date.now() }));
		}

		if (ex) {
			const patch: Record<string, unknown> = {
				state: 'BREAKDOWN_SENT',
				breakdownSentAt: at,
				_update: now,
			};
			if (lateReasons) patch['lateReasons'] = lateReasons;
			await updateDoc(this.docRef(ex.uid), patch);
			return {
				...ex,
				state: 'BREAKDOWN_SENT',
				breakdownSentAt: at,
				...(lateReasons ? { lateReasons } : {}),
				_update: now,
			} as CommissionCutAdvisorState;
		}

		const uid = uuidv4();
		const newDoc: Record<string, unknown> = {
			uid,
			cutDate: cd,
			advisorUid,
			state: 'BREAKDOWN_SENT',
			breakdownSentAt: at,
			_on: true,
			_create: now,
			_update: now,
		};
		if (lateReasons) newDoc['lateReasons'] = lateReasons;
		await setDoc(this.docRef(uid), newDoc);
		return newDoc as unknown as CommissionCutAdvisorState;
	}

	/**
	 * Mismo desglose en varios `cutDate` (Caso 2): original + corte diferido en pantalla.
	 * Un batch por llamada; uid nuevo por corte sin documento previo.
	 */
	async markBreakdownSentMirrorCuts(
		cutDates: number[],
		advisorUid: string,
		opts?: { breakdownSentAt?: number; lateEntry?: LateReasonEntry }
	): Promise<CommissionCutAdvisorState> {
		const sorted = [...new Set(cutDates.map((c) => this.coerceFirestoreMillis(c) ?? c))].sort((a, b) => a - b);
		if (sorted.length === 0) {
			throw new Error('markBreakdownSentMirrorCuts: no cut dates');
		}
		const at = opts?.breakdownSentAt ?? Date.now();
		const now = Date.now();
		const batch = writeBatch(this.firestore);
		let primaryReturn: CommissionCutAdvisorState | null = null;

		for (const cd of sorted) {
			const ex = await this.getByCutAndAdvisor(cd, advisorUid);
			let lateReasons: LateReasonEntry[] | undefined;
			if (opts?.lateEntry) {
				const base = normalizeLateReasons(ex?.lateReasons).filter((r) => r.step !== 'DESGLOSE');
				base.push(this.sanitizeLateReasonEntry({ ...opts.lateEntry, step: 'DESGLOSE', at: Date.now() }));
				lateReasons = base;
			}

			if (ex) {
				const patch: Record<string, unknown> = {
					state: 'BREAKDOWN_SENT',
					breakdownSentAt: at,
					_update: now,
				};
				if (lateReasons) patch['lateReasons'] = lateReasons;
				batch.update(this.docRef(ex.uid), patch);
				primaryReturn = { ...ex, ...patch, ...(lateReasons ? { lateReasons } : {}) } as CommissionCutAdvisorState;
			} else {
				const uid = uuidv4();
				const newDoc: Record<string, unknown> = {
					uid,
					cutDate: cd,
					advisorUid,
					state: 'BREAKDOWN_SENT',
					breakdownSentAt: at,
					_on: true,
					_create: now,
					_update: now,
				};
				if (lateReasons) newDoc['lateReasons'] = lateReasons;
				batch.set(this.docRef(uid), this.stripUndefinedFields(newDoc) as Record<string, unknown>);
				primaryReturn = newDoc as unknown as CommissionCutAdvisorState;
			}
		}

		await batch.commit();
		if (primaryReturn) return primaryReturn;
		const last = sorted[sorted.length - 1]!;
		return (await this.getByCutAndAdvisor(last, advisorUid)) as CommissionCutAdvisorState;
	}

	async markInvoiceSent(
		cutDate: number,
		advisorUid: string,
		invoiceUrl?: string,
		lateEntry?: LateReasonEntry,
		invoiceSentAt?: number
	): Promise<CommissionCutAdvisorState> {
		const cd = this.coerceFirestoreMillis(cutDate) ?? cutDate;
		const at = invoiceSentAt ?? Date.now();
		const now = Date.now();
		const ex = await this.getByCutAndAdvisor(cd, advisorUid);

		let lateReasons: LateReasonEntry[] | undefined;
		if (lateEntry) {
			lateReasons = normalizeLateReasons(ex?.lateReasons).filter((r) => r.step !== 'FACTURA');
			lateReasons.push(this.sanitizeLateReasonEntry({ ...lateEntry, step: 'FACTURA', at: Date.now() }));
		}

		const patch = this.stripUndefinedFields({
			state: 'SENT_TO_PAYMENT',
			invoiceSentAt: at,
			invoiceUrl,
			...(lateReasons ? { lateReasons } : {}),
			_update: now,
		});

		if (ex) {
			await updateDoc(this.docRef(ex.uid), patch);
			return { ...ex, ...patch } as CommissionCutAdvisorState;
		}
		const uid = uuidv4();
		await setDoc(
			this.docRef(uid),
			this.stripUndefinedFields({
				uid,
				cutDate: cd,
				advisorUid,
				state: 'SENT_TO_PAYMENT',
				invoiceSentAt: at,
				invoiceUrl,
				...(lateReasons ? { lateReasons } : {}),
				_on: true,
				_create: now,
				_update: now,
			}		) as Record<string, unknown>
		);
		return { uid, cutDate: cd, advisorUid, ...patch } as CommissionCutAdvisorState;
	}

	async markPaid(
		cutDate: number,
		advisorUid: string,
		receiptUrl?: string,
		lateEntry?: LateReasonEntry,
		receiptSentAt?: number
	): Promise<CommissionCutAdvisorState> {
		const cd = this.coerceFirestoreMillis(cutDate) ?? cutDate;
		const at = receiptSentAt ?? Date.now();
		const now = Date.now();
		const existing = await this.getByCutAndAdvisor(cd, advisorUid);
		const wasDeferred = !!(existing?.movedToNextCut || existing?.originalCutDate);
		const breakdownDl = getBreakdownDeadline(cd);
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
		const paidLate = wasDeferred || !!lateEntry || wasBreakdownLate || wasInvoiceLate || wasPaymentLate;

		let lateReasons: LateReasonEntry[] | undefined;
		if (lateEntry) {
			lateReasons = normalizeLateReasons(existing?.lateReasons).filter((r) => r.step !== 'PAGO');
			lateReasons.push(this.sanitizeLateReasonEntry({ ...lateEntry, step: 'PAGO', at: Date.now() }));
		}

		const patch = this.stripUndefinedFields({
			state: 'PAID',
			receiptSentAt: at,
			receiptUrl,
			paidLate,
			...(lateReasons ? { lateReasons } : {}),
			_update: now,
		});

		if (existing) {
			await updateDoc(this.docRef(existing.uid), patch);
			return { ...existing, ...patch } as CommissionCutAdvisorState;
		}
		const uid = uuidv4();
		await setDoc(
			this.docRef(uid),
			this.stripUndefinedFields({
				uid,
				cutDate: cd,
				advisorUid,
				state: 'PAID',
				receiptSentAt: at,
				receiptUrl,
				paidLate,
				...(lateReasons ? { lateReasons } : {}),
				_on: true,
				_create: now,
				_update: now,
			}		) as Record<string, unknown>
		);
		return { uid, cutDate: cd, advisorUid, ...patch } as CommissionCutAdvisorState;
	}

	async moveStateToNextCut(cutDate: number, advisorUid: string): Promise<void> {
		const cd = this.coerceFirestoreMillis(cutDate) ?? cutDate;
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cd),
			where('advisorUid', '==', advisorUid),
			where('_on', '==', true)
		);
		const snap = await getDocs(q);
		if (snap.empty) return;
		const list = snap.docs
			.map((d) => this.mapDocFromFirestore(d.data()))
			.filter((s): s is CommissionCutAdvisorState => s != null);
		const canonical = this.dedupeByCutAndAdvisor(list)[0];
		if (!canonical) return;
		const nextCutDate = getNextCutDate(cd);
		await updateDoc(this.docRef(canonical.uid), {
			movedToNextCut: true,
			originalCutDate: cd,
			deferredToCutDate: nextCutDate,
			_update: Date.now(),
		} as Record<string, unknown>);
	}
}
