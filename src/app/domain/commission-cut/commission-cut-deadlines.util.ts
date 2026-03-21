import {
	addBusinessDaysMexico,
	isAfterMexicoDate,
	mexicoDateKeyFromTimestamp,
	mexicoDateKeyToCanonicalTimestamp,
} from 'src/app/domain/time/mexico-time.util';

/**
 * Utilidades para plazos de comisión:
 * - Desglose: día 7 o 21 del mes
 * - Factura: 2 días hábiles desde desglose enviado
 * - Pago: 2 días hábiles desde factura enviada
 * - Regla: si no se envía factura a tiempo → comisión pasa al siguiente corte
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
 * Retorna el siguiente corte: mismo día (7 o 21) del mes siguiente.
 * Regla factura tardía: si no se envía factura a tiempo, la comisión pasa
 * al mismo día del mes siguiente (ej. 7 mar → 7 abr, 21 jun → 21 jul).
 * @see docs/domain/commission-cuts.md
 */
export function getNextCutDate(cutDate: number): number {
	const key = mexicoDateKeyFromTimestamp(cutDate);
	const [year, month, day] = key.split('-').map((x) => parseInt(x, 10));
	return Date.UTC(year, month, day, 12, 0, 0, 0);
}
