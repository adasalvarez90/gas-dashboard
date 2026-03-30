import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, getDoc, doc, updateDoc, setDoc, query, where, writeBatch } from '@angular/fire/firestore';
import {
	computeDeferralDisplayIndexFromPayments,
	normalizeDeferredToCutStored,
	sameCanonicalCutDate,
} from 'src/app/domain/commission-cut/commission-cut-deadlines.util';
import type { LateReasonEntry } from 'src/app/models/commission-cut-late-reason.model';
import { normalizeLateReasons } from 'src/app/models/commission-cut-late-reason.model';
import { deleteField } from 'firebase/firestore';

import * as _ from 'lodash';

import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { v4 as uuidv4 } from 'uuid';
import { CommissionPaymentDraft } from '../models/commission-engine.model';
import { getCutDateForDueDateMexico } from 'src/app/domain/time/mexico-time.util';

@Injectable({
	providedIn: 'root',
})
export class CommissionPaymentFirestoreService {
	private readonly collectionName = 'commissionPayments';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getCommissionPayments(trancheUid: string): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('trancheUid', '==', trancheUid), where('_on', '==', true));

		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPayment);
	}

	// ===== GET BY CONTRACT (all tranches) =====
	async getCommissionPaymentsByContract(contractUid: string): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('contractUid', '==', contractUid), where('_on', '==', true));

		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPayment);
	}

	// ===== GET BY CUT DATE =====
	async getCommissionPaymentsByCutDate(cutDate: number): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cutDate),
			where('_on', '==', true),
		);

		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPayment);
	}

	/** Todas las comisiones activas (Cortes de comisión: histórico completo, no solo últimos 12 meses). */
	async getAllActiveCommissionPayments(): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const snap = await getDocs(query(ref, where('_on', '==', true)));
		return snap.docs.map((d) => d.data() as CommissionPayment);
	}

	// ===== GET BY CUT DATE RANGE (for Commission Cuts page). Incluye pagos con cutDate en rango O deferredToCutDate en rango. =====
	async getCommissionPaymentsByCutDateRange(startCutDate: number, endCutDate: number): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const [snapCut, snapDeferred] = await Promise.all([
			getDocs(query(ref, where('cutDate', '>=', startCutDate), where('cutDate', '<=', endCutDate), where('_on', '==', true))),
			getDocs(query(ref, where('deferredToCutDate', '>=', startCutDate), where('deferredToCutDate', '<=', endCutDate), where('_on', '==', true))),
		]);
		const byUid = new Map<string, CommissionPayment>();
		[...snapCut.docs, ...snapDeferred.docs].forEach((d) => {
			const p = d.data() as CommissionPayment;
			if (!byUid.has(p.uid)) byUid.set(p.uid, p);
		});
		return Array.from(byUid.values());
	}

	// ===== MARK PAID BY TRANCH + ADVISOR =====
	async markCommissionPaymentsPaidByTrancheAndAdvisor(trancheUid: string, advisorUid: string, paidAt: number = Date.now()): Promise<number> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('trancheUid', '==', trancheUid),
			where('advisorUid', '==', advisorUid),
			where('paid', '==', false),
			where('cancelled', '==', false),
			where('_on', '==', true),
		);

		const snap = await getDocs(q);
		const batch = writeBatch(this.firestore);

		snap.docs.forEach(d => {
			batch.update(d.ref, { paid: true, paidAt, receiptSentAt: paidAt, _update: paidAt });
		});

		await batch.commit();
		return snap.size;
	}

	// ===== DEFER PAYMENTS TO NEXT CUT (regla factura tardía). La comisión permanece en cutDate y se añade deferredToCutDate. =====
	async movePaymentsToNextCut(cutDate: number, advisorUid: string, nextCutDate: number): Promise<number> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cutDate),
			where('advisorUid', '==', advisorUid),
			where('_on', '==', true),
		);
		const snap = await getDocs(q);
		const batch = writeBatch(this.firestore);
		const now = Date.now();
		snap.docs.forEach((d) => {
			batch.update(d.ref, {
				deferredToCutDate: nextCutDate,
				movedToNextCut: true,
				workflowOriginalCutDate: cutDate,
				_update: now,
			} as Record<string, unknown>);
		});
		await batch.commit();
		return snap.size;
	}

	/** Quita `deferredToCutDate` en los pagos indicados (misma comisión, un solo doc). */
	async clearDeferredToCutDateForPaymentUids(paymentUids: string[]): Promise<void> {
		if (paymentUids.length === 0) return;
		const now = Date.now();
		const chunkSize = 400;
		for (let i = 0; i < paymentUids.length; i += chunkSize) {
			const batch = writeBatch(this.firestore);
			for (const uid of paymentUids.slice(i, i + chunkSize)) {
				batch.update(doc(this.firestore, this.collectionName, uid), {
					deferredToCutDate: deleteField(),
					_update: now,
				} as Record<string, unknown>);
			}
			await batch.commit();
		}
	}

	/**
	 * Persiste `deferredToCutDate` según el destino efectivo (estado en cada `CommissionPayment`).
	 * Idempotente: no escribe si ya coincide; limpia el campo si ya no aplica diferido.
	 */
	async reconcileDeferredToCutDates(payments: CommissionPayment[]): Promise<number> {
		const { effectiveByUid } = computeDeferralDisplayIndexFromPayments(payments);
		type Op = { ref: ReturnType<typeof doc>; payload: Record<string, unknown> };
		const ops: Op[] = [];
		const now = Date.now();

		for (const p of payments) {
			if (p.cancelled || p.paid || p.paidAt) continue;
			const desired = effectiveByUid.get(p.uid) ?? null;
			const cur = normalizeDeferredToCutStored(p);
			const needClear = desired == null && cur != null;
			const needSet =
				desired != null && (cur == null || !sameCanonicalCutDate(desired, cur));
			if (!needClear && !needSet) continue;

			const ref = doc(this.firestore, this.collectionName, p.uid);
			if (needClear) {
				ops.push({
					ref,
					payload: { deferredToCutDate: deleteField(), _update: now } as Record<string, unknown>,
				});
			} else if (needSet && desired != null) {
				ops.push({
					ref,
					payload: { deferredToCutDate: desired, _update: now },
				});
			}
		}

		const chunkSize = 400;
		for (let i = 0; i < ops.length; i += chunkSize) {
			const batch = writeBatch(this.firestore);
			for (const op of ops.slice(i, i + chunkSize)) {
				batch.update(op.ref, op.payload);
			}
			await batch.commit();
		}
		return ops.length;
	}

	private mergeLateReasonsOnPayment(
		p: CommissionPayment,
		step: LateReasonEntry['step'],
		entry: LateReasonEntry,
	): LateReasonEntry[] {
		const base = normalizeLateReasons(p.lateReasons).filter((r) => r.step !== step);
		const text = entry.text?.trim();
		base.push({
			step,
			reason: entry.reason,
			...(text ? { text } : {}),
			at: entry.at ?? Date.now(),
		});
		return base;
	}

	async mergeLateReasonToPaymentUids(uids: string[], entry: LateReasonEntry): Promise<void> {
		const now = Date.now();
		const step = entry.step;
		for (const uid of uids) {
			const dref = doc(this.firestore, this.collectionName, uid);
			const snap = await getDoc(dref);
			if (!snap.exists()) continue;
			const p = snap.data() as CommissionPayment;
			const lateReasons = this.mergeLateReasonsOnPayment(p, step, { ...entry, step });
			await updateDoc(dref, { lateReasons, _update: now } as Record<string, unknown>);
		}
	}

	/** Pagos del corte (origen o diferido) para una asesora. */
	async getPaymentUidsForCutAndAdvisor(cutDate: number, advisorUid: string, onlyUnpaid = false): Promise<string[]> {
		const ref = collection(this.firestore, this.collectionName);
		const [snapCut, snapDef] = await Promise.all([
			getDocs(
				query(
					ref,
					where('cutDate', '==', cutDate),
					where('advisorUid', '==', advisorUid),
					where('_on', '==', true),
				),
			),
			getDocs(
				query(
					ref,
					where('deferredToCutDate', '==', cutDate),
					where('advisorUid', '==', advisorUid),
					where('_on', '==', true),
				),
			),
		]);
		const seen = new Set<string>();
		const uids: string[] = [];
		for (const d of [...snapCut.docs, ...snapDef.docs]) {
			const p = d.data() as CommissionPayment;
			if (seen.has(p.uid)) continue;
			if (onlyUnpaid && (p.paid || p.paidAt)) continue;
			seen.add(p.uid);
			uids.push(p.uid);
		}
		return uids;
	}

	async applyBreakdownSentToPaymentUids(
		uids: string[],
		opts: { breakdownSentAt: number; lateEntry?: LateReasonEntry },
	): Promise<void> {
		const now = Date.now();
		for (const uid of uids) {
			const dref = doc(this.firestore, this.collectionName, uid);
			const snap = await getDoc(dref);
			if (!snap.exists()) continue;
			const p = snap.data() as CommissionPayment;
			let lateReasons = normalizeLateReasons(p.lateReasons);
			if (opts.lateEntry) {
				lateReasons = this.mergeLateReasonsOnPayment(p, 'DESGLOSE', { ...opts.lateEntry, step: 'DESGLOSE' });
			}
			const raw = { breakdownSentAt: opts.breakdownSentAt, lateReasons, _update: now };
			await updateDoc(dref, _.omitBy(raw, _.isUndefined) as Record<string, unknown>);
		}
	}

	async applyInvoiceSentToPaymentUids(
		uids: string[],
		opts: { invoiceSentAt: number; invoiceUrl?: string; lateEntry?: LateReasonEntry },
	): Promise<void> {
		const now = Date.now();
		for (const uid of uids) {
			const dref = doc(this.firestore, this.collectionName, uid);
			const snap = await getDoc(dref);
			if (!snap.exists()) continue;
			const p = snap.data() as CommissionPayment;
			let lateReasons = normalizeLateReasons(p.lateReasons);
			if (opts.lateEntry) {
				lateReasons = this.mergeLateReasonsOnPayment(p, 'FACTURA', { ...opts.lateEntry, step: 'FACTURA' });
			}
			const raw = {
				invoiceSentAt: opts.invoiceSentAt,
				invoiceUrl: opts.invoiceUrl,
				lateReasons,
				_update: now,
			};
			await updateDoc(dref, _.omitBy(raw, _.isUndefined) as Record<string, unknown>);
		}
	}

	async applyPaidToPaymentUids(
		uids: string[],
		opts: {
			paidAt: number;
			receiptUrl?: string;
			paidLate?: boolean;
			lateEntry?: LateReasonEntry;
		},
	): Promise<void> {
		const now = Date.now();
		for (const uid of uids) {
			const dref = doc(this.firestore, this.collectionName, uid);
			const snap = await getDoc(dref);
			if (!snap.exists()) continue;
			const p = snap.data() as CommissionPayment;
			let lateReasons = normalizeLateReasons(p.lateReasons);
			if (opts.lateEntry) {
				lateReasons = this.mergeLateReasonsOnPayment(p, 'PAGO', { ...opts.lateEntry, step: 'PAGO' });
			}
			const raw = {
				paid: true,
				paidAt: opts.paidAt,
				receiptSentAt: opts.paidAt,
				receiptUrl: opts.receiptUrl,
				paidLate: opts.paidLate ?? false,
				lateReasons,
				_update: now,
			};
			await updateDoc(dref, _.omitBy(raw, _.isUndefined) as Record<string, unknown>);
		}
	}

	/**
	 * Path 2 (diferidas, proceso **individual** por selección/modal): cierra cada comisión y
	 * **elimina** `deferredToCutDate` al pagar para que la línea ya no se liste en el corte de trabajo;
	 * queda solo en su `cutDate` original. El flujo **grupal** usa `markCommissionPaymentsPaidByCutDateAndAdvisor`,
	 * que sí conserva `deferredToCutDate` mientras aplique al producto.
	 */
	async completeDeferredPath2OnPaymentGroups(
		groups: Array<{
			uids: string[];
			targetCutDate: number;
			originalCutDate: number;
			breakdownSentAt: number;
			invoiceSentAt: number;
			/** Si no se envía, no se toca `invoiceUrl` en Firestore. */
			invoiceUrl?: string;
			receiptSentAt: number;
			/** Si no se envía, no se toca `receiptUrl` en Firestore. */
			receiptUrl?: string;
			paidLate: boolean;
			lateStepEntries?: LateReasonEntry[];
		}>,
	): Promise<void> {
		const now = Date.now();
		for (const g of groups) {
			for (const uid of g.uids) {
				const dref = doc(this.firestore, this.collectionName, uid);
				const snap = await getDoc(dref);
				if (!snap.exists()) continue;
				const p = snap.data() as CommissionPayment;
				const order: LateReasonEntry['step'][] = ['DESGLOSE', 'FACTURA', 'PAGO'];
				const sorted = [...(g.lateStepEntries ?? [])].sort(
					(a, b) => order.indexOf(a.step) - order.indexOf(b.step),
				);
				let lateReasons = normalizeLateReasons(p.lateReasons);
				const acc: CommissionPayment = { ...p, lateReasons };
				for (const e of sorted) {
					lateReasons = this.mergeLateReasonsOnPayment(acc, e.step, { ...e, step: e.step });
					acc.lateReasons = lateReasons;
				}
				const payload: Record<string, unknown> = {
					breakdownSentAt: g.breakdownSentAt,
					invoiceSentAt: g.invoiceSentAt,
					receiptSentAt: g.receiptSentAt,
					paid: true,
					paidAt: g.receiptSentAt,
					paidLate: g.paidLate,
					lateReasons,
					_update: now,
				};
				if (g.invoiceUrl != null && g.invoiceUrl !== '') {
					payload['invoiceUrl'] = g.invoiceUrl;
				}
				if (g.receiptUrl != null && g.receiptUrl !== '') {
					payload['receiptUrl'] = g.receiptUrl;
				}
				payload['deferredToCutDate'] = deleteField();
				await updateDoc(dref, payload);
			}
		}
	}

	async patchInvoiceFieldsOnPaymentUids(
		uids: string[],
		opts: { invoiceUrl: string; invoiceSentAt: number },
	): Promise<void> {
		const now = Date.now();
		for (const uid of uids) {
			await updateDoc(doc(this.firestore, this.collectionName, uid), {
				invoiceUrl: opts.invoiceUrl,
				invoiceSentAt: opts.invoiceSentAt,
				_update: now,
			});
		}
	}

	async patchReceiptFieldsOnPaymentUids(
		uids: string[],
		opts: { receiptUrl: string; receiptSentAt: number },
	): Promise<void> {
		const now = Date.now();
		for (const uid of uids) {
			await updateDoc(doc(this.firestore, this.collectionName, uid), {
				receiptUrl: opts.receiptUrl,
				receiptSentAt: opts.receiptSentAt,
				_update: now,
			});
		}
	}

	// ===== MARK PAID BY UIDS (proceso individual por UID; no conserva corte de trabajo) =====
	/**
	 * Marca pagadas por UID. Siempre quita `deferredToCutDate` para que la línea no siga en el corte agrupado.
	 * El flujo grupal es `markCommissionPaymentsPaidByCutDateAndAdvisor`.
	 */
	async markCommissionPaymentsPaidByUids(
		paymentUids: string[],
		paidAt: number = Date.now(),
		_opts?: { targetCutDate?: number; originalCutDate?: number }
	): Promise<number> {
		if (paymentUids.length === 0) return 0;
		const batch = writeBatch(this.firestore);
		const updates: Record<string, unknown> = {
			paid: true,
			paidAt,
			receiptSentAt: paidAt,
			_update: paidAt,
			deferredToCutDate: deleteField(),
		} as Record<string, unknown>;
		for (const uid of paymentUids) {
			const ref = doc(this.firestore, this.collectionName, uid);
			batch.update(ref, updates);
		}
		await batch.commit();
		return paymentUids.length;
	}

	// ===== MARK PAID BY CUT DATE + ADVISOR (flujo grupal: conserva `deferredToCutDate` en docs ya pagados) =====
	async markCommissionPaymentsPaidByCutDateAndAdvisor(cutDate: number, advisorUid: string, paidAt: number = Date.now()): Promise<number> {
		const ref = collection(this.firestore, this.collectionName);
		const [snapCut, snapDeferred] = await Promise.all([
			getDocs(query(ref, where('cutDate', '==', cutDate), where('advisorUid', '==', advisorUid), where('paid', '==', false), where('cancelled', '==', false), where('_on', '==', true))),
			getDocs(query(ref, where('deferredToCutDate', '==', cutDate), where('advisorUid', '==', advisorUid), where('paid', '==', false), where('cancelled', '==', false), where('_on', '==', true))),
		]);
		const allDocs = [...snapCut.docs, ...snapDeferred.docs];
		const docIds = new Set<string>();
		const batch = writeBatch(this.firestore);
		allDocs.forEach((d) => {
			if (!docIds.has(d.id)) {
				docIds.add(d.id);
				batch.update(d.ref, { paid: true, paidAt, receiptSentAt: paidAt, _update: paidAt });
			}
		});
		await batch.commit();
		return docIds.size;
	}

	// ===== CANCEL FUTURE UNPAID BY CONTRACT =====
	async cancelFutureUnpaidByContract(contractUid: string, cancelledAt: number = Date.now()): Promise<number> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('contractUid', '==', contractUid),
			where('paid', '==', false),
			where('_on', '==', true),
		);

		const snap = await getDocs(q);
		const batch = writeBatch(this.firestore);
		let updated = 0;

		snap.docs.forEach(d => {
			const payment = d.data() as CommissionPayment;
			if (payment.cancelled) return;
			if (payment.dueDate > cancelledAt) {
				updated++;
				batch.update(d.ref, { cancelled: true, _update: cancelledAt });
			}
		});

		await batch.commit();
		return updated;
	}

	// ➕ Create commissionPayment
	async createManyCommissionPayment(payments: CommissionPaymentDraft[]): Promise<CommissionPayment[]> {
		const createdPayments: CommissionPayment[] = [];

		for (const payment of payments) {

			const uid = uuidv4();

			const ref = doc(this.firestore, this.collectionName, uid);

			const newPayment = {
				...payment,
				uid,
				paid: false,
				cancelled: false,
				_create: Date.now(),
				_on: true
			};
			// Firestore does not support explicit `undefined` values.
			const cleanedPayment = _.omitBy(newPayment, _.isUndefined) as unknown as CommissionPayment;
			createdPayments.push(cleanedPayment);
			
			await setDoc(ref, cleanedPayment as any);
		}

		return createdPayments;
	}

	// ➕ Create adjustment commissionPayment (separate entry, never mutates paid payments)
	async createAdjustmentCommissionPayment(params: {
		contractUid: string;
		trancheUid: string;
		advisorUid: string;
		role: string;
		amount: number; // can be positive or negative
		dueDate: number;
		policyUid?: string;
		adjustsPaymentUid?: string;
		adjustmentReason?: string;
		scheme: string;
		grossCommissionPercent: number;
		roleSplitPercent: number;
	}): Promise<CommissionPayment> {
		const uid = uuidv4();
		const now = Date.now();

		const cutDate = this.getCutDateForDueDate(params.dueDate);

		const newPayment: CommissionPayment = {
			uid,
			contractUid: params.contractUid,
			trancheUid: params.trancheUid,
			advisorUid: params.advisorUid,
			role: params.role,
			policyUid: params.policyUid,
			adjustsPaymentUid: params.adjustsPaymentUid,
			adjustmentReason: params.adjustmentReason,
			grossCommissionPercent: params.grossCommissionPercent,
			roleSplitPercent: params.roleSplitPercent,
			amount: params.amount,
			paymentType: 'ADJUSTMENT',
			dueDate: params.dueDate,
			cutDate,
			paid: false,
			cancelled: false,
			installment: 0,
			scheme: params.scheme,
			_create: now,
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		// Firestore does not support explicit `undefined` values.
		const cleanedPayment = _.omitBy(newPayment, _.isUndefined) as unknown as CommissionPayment;
		await setDoc(ref, cleanedPayment as any);

		return cleanedPayment;
	}

	/** Motivo de diferimiento por fondeo anterior al corte (catálogo + texto). */
	async updateFundingDeferralReason(
		uid: string,
		fundingDeferralReasonCode: string,
		fundingDeferralReasonText: string,
	): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		const now = Date.now();
		await updateDoc(ref, {
			fundingDeferralReasonCode,
			fundingDeferralReasonText: fundingDeferralReasonText?.trim() ?? '',
			_update: now,
		});
	}

	private getCutDateForDueDate(dueDate: number): number {
		return getCutDateForDueDateMexico(dueDate);
	}
}
