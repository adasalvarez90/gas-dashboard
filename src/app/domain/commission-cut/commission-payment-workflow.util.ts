import type { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import type { CommissionCutAdvisorState, CommissionCutState } from 'src/app/models/commission-cut-state.model';
import type { LateReasonEntry } from 'src/app/models/commission-cut-late-reason.model';
import { normalizeLateReasons } from 'src/app/models/commission-cut-late-reason.model';
import { mexicoDateKeyFromTimestamp } from 'src/app/domain/time/mexico-time.util';

function sameCanonicalCutDate(a: number, b: number): boolean {
	return mexicoDateKeyFromTimestamp(a) === mexicoDateKeyFromTimestamp(b);
}

const RANK: Record<CommissionCutState, number> = {
	PENDING: 0,
	BREAKDOWN_SENT: 1,
	INVOICE_RECIVED: 2,
	SENT_TO_PAYMENT: 3,
	PAID: 4,
};

/**
 * Estado de flujo derivado desde `commissionPayments`.
 * Mantiene la forma de CommissionCutAdvisorState para compatibilidad.
 */
export type AdvisorWorkflowState = CommissionCutAdvisorState;

/** Estado del flujo inferido desde campos del pago (híbrido: verdad en `CommissionPayment`). */
export function inferCommissionWorkflowState(p: CommissionPayment): CommissionCutState {
	if (p.paid || p.paidAt) return 'PAID';
	if (p.sentToPaymentAt != null) return 'SENT_TO_PAYMENT';
	if (p.invoiceSentAt != null) return 'INVOICE_RECIVED';
	if (p.breakdownSentAt != null) return 'BREAKDOWN_SENT';
	return 'PENDING';
}

/**
 * Para diferidos implícitos: estado “como advisor state” solo en corte original o en `deferredToCutDate`.
 * En cortes intermedios de la cadena → null (sin avance local).
 */
export function paymentWorkflowStateAtCut(p: CommissionPayment, cutDate: number): AdvisorWorkflowState | null {
	if (p.cancelled || p.paid || p.paidAt) return null;
	const atOrig = sameCanonicalCutDate(cutDate, p.cutDate);
	const atDef =
		p.deferredToCutDate != null &&
		p.deferredToCutDate !== p.cutDate &&
		sameCanonicalCutDate(cutDate, p.deferredToCutDate);
	if (!atOrig && !atDef) return null;
	return commissionPaymentToSyntheticAdvisorState(p);
}

/** Construye un `CommissionCutAdvisorState` desde un pago (UI / plazos / colores). */
export function commissionPaymentToSyntheticAdvisorState(p: CommissionPayment): AdvisorWorkflowState {
	const state = inferCommissionWorkflowState(p);
	return {
		uid: `pay:${p.uid}`,
		cutDate: p.cutDate,
		advisorUid: p.advisorUid,
		state,
		breakdownSentAt: p.breakdownSentAt,
		invoiceSentAt: p.invoiceSentAt,
		sentToPaymentAt: p.sentToPaymentAt,
		receiptSentAt: p.receiptSentAt ?? (p.paid && p.paidAt ? p.paidAt : undefined),
		invoiceUrl: p.invoiceUrl,
		receiptUrl: p.receiptUrl,
		lateReasons: p.lateReasons ? normalizeLateReasons(p.lateReasons) : undefined,
		paidLate: p.paidLate,
		movedToNextCut: p.movedToNextCut,
		originalCutDate: p.workflowOriginalCutDate,
		deferredToCutDate: p.deferredToCutDate,
	};
}

export type DerivedAdvisorWorkflow = CommissionCutState | 'MIXED';

/** Agrega estados de varias líneas en la tarjeta (asesora + corte de resumen). */
export function deriveAdvisorWorkflowFromPayments(
	payments: CommissionPayment[],
	summaryCutDate: number,
): { derived: DerivedAdvisorWorkflow; mergedState: CommissionCutAdvisorState | null } {
	const relevant = payments.filter((p) => {
		if (p.cancelled) return false;
		const inOrig = sameCanonicalCutDate(summaryCutDate, p.cutDate);
		const inDef =
			p.deferredToCutDate != null &&
			p.deferredToCutDate !== p.cutDate &&
			sameCanonicalCutDate(summaryCutDate, p.deferredToCutDate);
		return inOrig || inDef;
	});
	if (relevant.length === 0) return { derived: 'PENDING', mergedState: null };

	const states = relevant.map((p) => inferCommissionWorkflowState(p));
	const unique = new Set(states);
	let derived: DerivedAdvisorWorkflow;
	if (unique.size === 1) derived = states[0]!;
	else if (states.every((x) => x === 'PAID')) derived = 'PAID';
	else if (states.every((x) => x === 'PENDING')) derived = 'PENDING';
	else derived = 'MIXED';

	const worst = states.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'PENDING' as CommissionCutState);
	const anyPaidLate = relevant.some((p) => p.paidLate);
	const mergedState: AdvisorWorkflowState = {
		uid: `card:${summaryCutDate}`,
		cutDate: summaryCutDate,
		advisorUid: relevant[0]!.advisorUid,
		state: derived === 'MIXED' ? worst : derived,
		breakdownSentAt: maxDefined(relevant.map((p) => p.breakdownSentAt)),
		invoiceSentAt: maxDefined(relevant.map((p) => p.invoiceSentAt)),
		sentToPaymentAt: maxDefined(relevant.map((p) => p.sentToPaymentAt)),
		receiptSentAt: maxDefined(relevant.map((p) => p.receiptSentAt ?? p.paidAt)),
		invoiceUrl: relevant.find((p) => p.invoiceUrl)?.invoiceUrl,
		receiptUrl: relevant.find((p) => p.receiptUrl)?.receiptUrl,
		lateReasons: mergeLateReasons(relevant),
		paidLate: anyPaidLate || undefined,
		movedToNextCut: relevant.some((p) => p.movedToNextCut) || undefined,
		originalCutDate: minDefined(relevant.map((p) => p.workflowOriginalCutDate).filter((x): x is number => x != null)),
		deferredToCutDate: relevant.find((p) => p.deferredToCutDate)?.deferredToCutDate,
	};
	return { derived, mergedState };
}

function maxDefined(arr: (number | undefined)[]): number | undefined {
	const n = arr.filter((x): x is number => x != null && Number.isFinite(x));
	if (!n.length) return undefined;
	return Math.max(...n);
}

function minDefined(arr: number[]): number | undefined {
	if (!arr.length) return undefined;
	return Math.min(...arr);
}

function mergeLateReasons(payments: CommissionPayment[]): LateReasonEntry[] | undefined {
	const out: LateReasonEntry[] = [];
	for (const p of payments) {
		out.push(...normalizeLateReasons(p.lateReasons));
	}
	return out.length ? out : undefined;
}
