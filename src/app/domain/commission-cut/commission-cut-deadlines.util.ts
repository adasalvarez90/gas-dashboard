import {
	addBusinessDaysMexico,
	isAfterMexicoDate,
	mexicoDateKeyFromTimestamp,
	mexicoDateKeyToCanonicalTimestamp,
} from 'src/app/domain/time/mexico-time.util';
import type { CommissionCutAdvisorState } from 'src/app/models/commission-cut-state.model';
import { normalizeLateReasons } from 'src/app/models/commission-cut-late-reason.model';
import type { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { paymentWorkflowStateAtCut } from 'src/app/domain/commission-cut/commission-payment-workflow.util';

function pad2(n: number): string {
	return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Utilidades para plazos de comisión:
 * - Desglose: 2 días hábiles desde la fecha de corte
 * - Factura: 2 días hábiles desde desglose enviado
 * - Pago / comprobante: 2 días hábiles desde factura recibida
 * - Arrastre al siguiente corte (implícito): cualquier tipo de comisión, solo si ya cayó el corte original
 *   y el flujo (por timestamps de estado o falta de documento de estado) tiene un paso vencido.
 */

/** Añade N días hábiles a una fecha */
export function addBusinessDays(fromTs: number, days: number): number {
	return addBusinessDaysMexico(fromTs, days);
}

/** Obtiene el día límite de desglose (7 o 21) para un cutDate */
export function getBreakdownDeadlineDay(cutDate: number): 7 | 21 {
	return mexicoDateKeyFromTimestamp(cutDate).endsWith('-07') ? 7 : 21;
}

/** Límite para enviar factura desde el corte: 2 días hábiles. */
export function getBreakdownDeadline(cutDate: number): number {
	return addBusinessDays(cutDate, 2);
}

/** Calcula límite para factura: 2 días hábiles desde breakdownSentAt */
export function getInvoiceDeadline(breakdownSentAt: number): number {
	return addBusinessDays(breakdownSentAt, 2);
}

/** Calcula límite para pago: 2 días hábiles desde invoiceSentAt */
export function getPaymentDeadline(invoiceSentAt: number): number {
	return addBusinessDays(invoiceSentAt, 2);
}

/** Indica si la factura se envió tarde (después del plazo) */
export function isInvoiceLate(invoiceSentAt: number | undefined, invoiceDeadline: number): boolean {
	if (!invoiceSentAt) return false;
	return isAfterMexicoDate(invoiceSentAt, invoiceDeadline);
}

/** Indica si falta enviar factura y ya pasó el plazo */
export function isInvoiceOverdue(invoiceSentAt: number | undefined, invoiceDeadline: number): boolean {
	if (invoiceSentAt) return false;
	return isAfterMexicoDate(Date.now(), invoiceDeadline);
}

/** Indica si falta pagar y ya pasó el plazo */
export function isPaymentOverdue(receiptSentAt: number | undefined, paymentDeadline: number): boolean {
	if (receiptSentAt) return false;
	return isAfterMexicoDate(Date.now(), paymentDeadline);
}


/** Rango por defecto para cortes: últimos 12 meses (días 7 y 21). Usado en loadAfterAuth y Commission Cuts. */
/** Usa formato canónico (12:00 UTC) igual que getCutDateForDueDateMexico para que la query incluya los documentos. */
export function getDefaultCutDateRange(): { startCutDate: number; endCutDate: number } {
	const todayKey = mexicoDateKeyFromTimestamp(Date.now());
	const [y, m, d] = todayKey.split('-').map((x) => parseInt(x, 10));
	let endKey: string;
	if ((d || 1) < 7) {
		const prevMonth = m === 1 ? 12 : (m || 1) - 1;
		const prevYear = m === 1 ? y - 1 : y;
		endKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}-21`;
	} else {
		endKey = `${y}-${String(m || 1).padStart(2, '0')}-21`;
	}
	const [ey, em] = endKey.split('-').map((x) => parseInt(x, 10));
	const endDate = new Date(ey, (em || 1) - 1, 21);
	endDate.setMonth(endDate.getMonth() - 12);
	const sy = endDate.getFullYear();
	const sm = endDate.getMonth() + 1;
	const startKey = `${sy}-${String(sm).padStart(2, '0')}-07`;
	return {
		startCutDate: mexicoDateKeyToCanonicalTimestamp(startKey),
		endCutDate: mexicoDateKeyToCanonicalTimestamp(endKey),
	};
}

/**
 * Siguiente corte de negocio (factura tardía / vista diferida): mismo día de corte (7 u 21)
 * en el **mes calendario siguiente** (ej. 7 mar → 7 abr; 21 jun → 21 jul).
 * No es el siguiente 7/21 en la secuencia del mismo mes (eso sería 7 mar → 21 mar).
 * @see docs/domain/commission-cuts.md
 */
export function getNextCutDate(cutDate: number): number {
	const key = mexicoDateKeyFromTimestamp(cutDate);
	const [y, m, d] = key.split('-').map((x) => parseInt(x, 10));
	const month = m || 1;
	const day = d || 7;
	const nextMonth = month === 12 ? 1 : month + 1;
	const nextYear = month === 12 ? y + 1 : y;
	const nextKey = `${nextYear}-${pad2(nextMonth)}-${pad2(day)}`;
	return mexicoDateKeyToCanonicalTimestamp(nextKey);
}

/**
 * El día de corte original ya ocurrió (fecha México); no mostrar arrastre desde cortes “futuros”.
 */
export function isOriginalBusinessCutDayReached(cutDate: number): boolean {
	return mexicoDateKeyFromTimestamp(cutDate) <= mexicoDateKeyFromTimestamp(Date.now());
}

/**
 * Hay incumplimiento en la cadena desglose → factura → comprobante según timestamps (o sin estado = pendiente de desglose).
 * Misma regla para IMMEDIATE, RECURRING, FINAL y ADJUSTMENT.
 */
/**
 * Pagada en tiempo “estricto”: ningún paso del flujo superó su plazo de 2 días hábiles (por fechas guardadas).
 * Si hay motivos de atraso persistidos o `paidLate`, cuenta como tarde aunque las fechas parezcan sanas.
 * No compara con el siguiente corte: un comprobante “a tiempo” respecto al plazo de factura no borra un desglose tarde.
 */
export function paymentFlowHasAnyLateStep(
	originalCutDate: number,
	st: CommissionCutAdvisorState | null | undefined,
): boolean {
	if (!st) return false;
	if (st.paidLate) return true;
	if (normalizeLateReasons(st.lateReasons).length > 0) return true;
	const breakdownDl = getBreakdownDeadline(originalCutDate);
	if (st.breakdownSentAt && isAfterMexicoDate(st.breakdownSentAt, breakdownDl)) return true;
	if (st.invoiceSentAt && st.breakdownSentAt) {
		const invDl = getInvoiceDeadline(st.breakdownSentAt);
		if (isInvoiceLate(st.invoiceSentAt, invDl)) return true;
	}
	if (st.receiptSentAt && st.invoiceSentAt) {
		const payDl = getPaymentDeadline(st.invoiceSentAt);
		if (isAfterMexicoDate(st.receiptSentAt, payDl)) return true;
	}
	return false;
}

export function isWorkflowOverdueForImplicitDeferral(
	cutDate: number,
	state: CommissionCutAdvisorState | null | undefined,
): boolean {
	if (!state?.breakdownSentAt) {
		return isInvoiceOverdue(undefined, getBreakdownDeadline(cutDate));
	}
	if (!state.invoiceSentAt) {
		return isInvoiceOverdue(undefined, getInvoiceDeadline(state.breakdownSentAt));
	}
	if (!state.receiptSentAt) {
		return isPaymentOverdue(undefined, getPaymentDeadline(state.invoiceSentAt));
	}
	return false;
}

export type PaymentLikeForDeferralDisplay = {
	cutDate: number;
	paymentType?: string;
	deferredToCutDate?: number;
	cancelled?: boolean;
	paid?: boolean;
	paidAt?: number;
};

/** ¿El pago impago califica para aparecer también en un corte de “diferida” (además del original)? */
function qualifiesForDeferralDisplay(
	p: PaymentLikeForDeferralDisplay,
	originalCutAdvisorState: CommissionCutAdvisorState | null | undefined,
): boolean {
	if (p.cancelled || p.paid || p.paidAt) return false;
	if (!isOriginalBusinessCutDayReached(p.cutDate)) return false;
	const explicit = p.deferredToCutDate != null && p.deferredToCutDate !== p.cutDate;
	const implicit = isWorkflowOverdueForImplicitDeferral(p.cutDate, originalCutAdvisorState ?? null);
	return implicit || explicit;
}

/**
 * Corte único (además del original) donde la UI debe mostrar la comisión como diferida.
 *
 * Regla de negocio: si en el corte original no se cumple el flujo a tiempo (desglose en 2 hábiles
 * desde el corte, factura en 2 hábiles desde el desglose, comprobante en 2 hábiles desde la factura),
 * la comisión pasa al **siguiente** corte de negocio (7/21 del mes siguiente). Si en **ese** corte
 * vuelve a incurrirse en el mismo tipo de incumplimiento, avanza al siguiente, y así sucesivamente.
 *
 * En pantalla solo hay **dos** lugares: corte original (atrasada) + **un** corte destino actual (diferida).
 * No se duplica en ene + feb + mar; cuando feb también vence, el destino pasa a mar, etc.
 *
 * `deferredToCutDate` en Firestore puede quedar desactualizado (ej. sigue en feb); aquí se recalcula
 * encadenando con las mismas reglas hasta la fecha efectiva según hoy.
 *
 * @param getStateForCut - estado del flujo para `(cutDate, asesora)`. Para cada corte intermedio, si no
 *   hay documento, se asume sin avance en ese corte (plazo de desglose desde ese `cutDate`).
 */
export function getEffectiveDeferredDisplayCut(
	p: PaymentLikeForDeferralDisplay,
	advisorUid: string,
	getStateForCut: (cutDate: number) => CommissionCutAdvisorState | null,
): number | null {
	const origSt = getStateForCut(p.cutDate);
	if (!qualifiesForDeferralDisplay(p, origSt)) return null;

	let D =
		p.deferredToCutDate != null && p.deferredToCutDate !== p.cutDate
			? p.deferredToCutDate
			: getNextCutDate(p.cutDate);

	let steps = 0;
	while (steps++ < 120) {
		const stD = getStateForCut(D);
		const missedAtD =
			isOriginalBusinessCutDayReached(D) && isWorkflowOverdueForImplicitDeferral(D, stD);
		if (!missedAtD) break;
		const nextD = getNextCutDate(D);
		if (nextD <= D) break;
		D = nextD;
	}
	return D;
}

/**
 * Una sola pasada: horizon + mapa uid → corte diferido efectivo (evita llamar getEffectiveDeferredDisplayCut dos veces por pago).
 */
export function computeDeferralDisplayIndex(
	payments: (PaymentLikeForDeferralDisplay & { advisorUid: string; uid: string; cancelled?: boolean; paid?: boolean; paidAt?: number })[],
	getStateForCut: (cutDate: number, advisorUid: string) => CommissionCutAdvisorState | null,
): { horizon: number; effectiveByUid: Map<string, number | null> } {
	const effectiveByUid = new Map<string, number | null>();
	let horizon = getDeferralEndCutDate(payments);
	for (const p of payments) {
		if (p.cancelled || p.paid || p.paidAt) {
			effectiveByUid.set(p.uid, null);
			continue;
		}
		const eff = getEffectiveDeferredDisplayCut(p, p.advisorUid, (cd) => getStateForCut(cd, p.advisorUid));
		effectiveByUid.set(p.uid, eff);
		if (eff != null) horizon = Math.max(horizon, eff);
	}
	return { horizon, effectiveByUid };
}

/**
 * Índice de diferidas con estado leído desde cada `CommissionPayment` (modelo híbrido).
 */
export function computeDeferralDisplayIndexFromPayments(payments: CommissionPayment[]): {
	horizon: number;
	effectiveByUid: Map<string, number | null>;
} {
	const effectiveByUid = new Map<string, number | null>();
	let horizon = getDeferralEndCutDate(payments);
	for (const p of payments) {
		if (p.cancelled || p.paid || p.paidAt) {
			effectiveByUid.set(p.uid, null);
			continue;
		}
		const eff = getEffectiveDeferredDisplayCut(p, p.advisorUid, (cd) => paymentWorkflowStateAtCut(p, cd));
		effectiveByUid.set(p.uid, eff);
		if (eff != null) horizon = Math.max(horizon, eff);
	}
	return { horizon, effectiveByUid };
}

/** Tope de horizonte (dropdown / cap) reutilizando el índice si ya lo tienes. */
export function getDeferralHorizonCutDate(
	payments: (PaymentLikeForDeferralDisplay & { advisorUid: string; uid: string; cancelled?: boolean; paid?: boolean; paidAt?: number })[],
	getStateForCut: (cutDate: number, advisorUid: string) => CommissionCutAdvisorState | null,
): number {
	return computeDeferralDisplayIndex(payments, getStateForCut).horizon;
}

/**
 * Fin del horizonte para diferidas implícitas: último corte visto en datos o el fin del rango por defecto (el mayor).
 */
export function getDeferralEndCutDate(payments: { cutDate?: number; deferredToCutDate?: number }[]): number {
	const { endCutDate } = getDefaultCutDateRange();
	let max = endCutDate;
	for (const p of payments) {
		if (p.cutDate) max = Math.max(max, p.cutDate);
		if (p.deferredToCutDate) max = Math.max(max, p.deferredToCutDate);
	}
	return max;
}

/**
 * Cortes estrictamente **posteriores** a `fromCut` hasta `endInclusive` (cadena `getNextCutDate`).
 * No incluye `fromCut`.
 */
export function subsequentCutsInRange(fromCut: number, endInclusive: number): number[] {
	const out: number[] = [];
	let next = getNextCutDate(fromCut);
	while (next <= endInclusive) {
		out.push(next);
		next = getNextCutDate(next);
	}
	return out;
}

/**
 * Retorna el corte (7 o 21) más reciente que es menor o igual a la fecha dada.
 * Usado cuando el usuario indica que el desglose fue antes del corte diferido.
 */
export function getLastCutDateOnOrBefore(ts: number): number {
	const key = mexicoDateKeyFromTimestamp(ts);
	const [y, m, d] = key.split('-').map((x) => parseInt(x, 10));
	const day = d || 1;
	if (day >= 21) return mexicoDateKeyToCanonicalTimestamp(`${y}-${String(m).padStart(2, '0')}-21`);
	if (day >= 7) return mexicoDateKeyToCanonicalTimestamp(`${y}-${String(m).padStart(2, '0')}-07`);
	const prevM = m === 1 ? 12 : m - 1;
	const prevY = m === 1 ? y - 1 : y;
	return mexicoDateKeyToCanonicalTimestamp(`${prevY}-${String(prevM).padStart(2, '0')}-21`);
}

/** Retorna el corte inmediatamente anterior en la secuencia 7/21. */
export function getPreviousCutDate(cutDate: number): number {
	const key = mexicoDateKeyFromTimestamp(cutDate);
	const [y, m, d] = key.split('-').map((x) => parseInt(x, 10));
	const day = d || 1;
	if (day === 7) {
		const prevM = m === 1 ? 12 : m - 1;
		const prevY = m === 1 ? y - 1 : y;
		return mexicoDateKeyToCanonicalTimestamp(`${prevY}-${String(prevM).padStart(2, '0')}-21`);
	}
	return mexicoDateKeyToCanonicalTimestamp(`${y}-${String(m).padStart(2, '0')}-07`);
}

/**
 * Mínimo corte válido al que puede asignarse una comisión diferida.
 * Una comisión diferida no puede asignarse a un corte anterior al primer corte
 * en que fue diferida (p. ej. 7 feb → 7 mar → 21 mar: no puede ir a 21 feb).
 */
export function getMinValidTargetCut(originalCutDate: number, deferredCutDate: number): number {
	const origDay = getBreakdownDeadlineDay(originalCutDate);
	let cur = deferredCutDate;
	let minSameDay = deferredCutDate;
	while (cur > originalCutDate) {
		const curDay = getBreakdownDeadlineDay(cur);
		if (curDay === origDay && cur >= originalCutDate) minSameDay = cur;
		cur = getPreviousCutDate(cur);
	}
	return minSameDay >= originalCutDate ? minSameDay : originalCutDate;
}

/** `deferredToCutDate` persistido: ignora ausente o igual al origen (valor inválido). */
export function normalizeDeferredToCutStored(p: { cutDate: number; deferredToCutDate?: number }): number | null {
	const d = p.deferredToCutDate;
	if (d == null || d === p.cutDate) return null;
	return d;
}

/** Misma fecha de corte de negocio (7/21) en calendario México. */
export function sameCanonicalCutDate(a: number, b: number): boolean {
	return mexicoDateKeyFromTimestamp(a) === mexicoDateKeyFromTimestamp(b);
}

export type DeferralPaymentCase = 'BEFORE_DEFERRED_CUT' | 'ON_OR_AFTER_DEFERRED_CUT';

/**
 * Caso 1 vs 2 (commission-cuts.md): compara fechas de acción del usuario con el corte diferido.
 * Usa claves de fecha México (YYYY-MM-DD): acciones con día calendario estrictamente anterior al día del corte → BEFORE.
 */
export function classifyDeferralPaymentCase(
	deferredCutDate: number,
	actionTimestamps: number[],
): DeferralPaymentCase | null {
	if (!Number.isFinite(deferredCutDate) || actionTimestamps.length === 0) return null;
	const defKey = mexicoDateKeyFromTimestamp(deferredCutDate);
	const valid = actionTimestamps.filter((t) => typeof t === 'number' && Number.isFinite(t) && t > 0);
	if (!valid.length) return null;
	const minKey = valid.map((t) => mexicoDateKeyFromTimestamp(t)).sort()[0];
	if (minKey < defKey) return 'BEFORE_DEFERRED_CUT';
	return 'ON_OR_AFTER_DEFERRED_CUT';
}
