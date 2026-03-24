import {
	addBusinessDaysMexico,
	isAfterMexicoDate,
	mexicoDateKeyFromTimestamp,
	mexicoDateKeyToCanonicalTimestamp,
} from 'src/app/domain/time/mexico-time.util';
import type { CommissionCutAdvisorState } from 'src/app/models/commission-cut-state.model';
import { normalizeLateReasons } from 'src/app/models/commission-cut-late-reason.model';

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

/**
 * Segundo corte donde un pago **impago** puede listarse (además del `cutDate`). `null` = solo en el original.
 *
 * - **Explícito** (`deferredToCutDate` ≠ `cutDate`, p. ej. factura tarde): siempre ese destino.
 * - **Implícito**: impago, corte original ya ocurrido, cadena desglose→factura→comprobante vencida según estado
 *   (`isWorkflowOverdueForImplicitDeferral`) → `getNextCutDate(cutDate)`. Aplica a **todos** los `paymentType`.
 *
 * Como mucho **dos** cortes en pantalla (original + este), nunca cadena may→jun→jul…
 */
export function getUnpaidDeferredSecondCutDate(
	p: PaymentLikeForDeferralDisplay,
	originalCutAdvisorState?: CommissionCutAdvisorState | null,
): number | null {
	if (p.cancelled || p.paid || p.paidAt) return null;
	if (p.deferredToCutDate != null && p.deferredToCutDate !== p.cutDate) {
		return p.deferredToCutDate;
	}
	if (!isOriginalBusinessCutDayReached(p.cutDate)) return null;
	if (!isWorkflowOverdueForImplicitDeferral(p.cutDate, originalCutAdvisorState ?? null)) return null;
	return getNextCutDate(p.cutDate);
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
