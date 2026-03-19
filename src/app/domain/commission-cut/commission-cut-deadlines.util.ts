/**
 * Utilidades para plazos de comisión:
 * - Desglose: día 7 o 21 del mes
 * - Factura: 2 días hábiles desde desglose enviado
 * - Pago: 2 días hábiles desde factura enviada
 * - Regla: si no se envía factura a tiempo → comisión pasa al siguiente corte
 */

/** Añade N días hábiles a una fecha */
export function addBusinessDays(fromTs: number, days: number): number {
	const d = new Date(fromTs);
	let remaining = days;
	while (remaining > 0) {
		d.setDate(d.getDate() + 1);
		const day = d.getDay();
		if (day !== 0 && day !== 6) remaining--;
	}
	return d.getTime();
}

/** Obtiene el día límite de desglose (7 o 21) para un cutDate */
export function getBreakdownDeadlineDay(cutDate: number): 7 | 21 {
	const d = new Date(cutDate);
	return d.getDate() === 7 ? 7 : 21;
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
	return invoiceSentAt > invoiceDeadline;
}

/** Indica si falta enviar factura y ya pasó el plazo */
export function isInvoiceOverdue(invoiceSentAt: number | undefined, invoiceDeadline: number): boolean {
	if (invoiceSentAt) return false;
	return Date.now() > invoiceDeadline;
}

/** Indica si falta pagar y ya pasó el plazo */
export function isPaymentOverdue(receiptSentAt: number | undefined, paymentDeadline: number): boolean {
	if (receiptSentAt) return false;
	return Date.now() > paymentDeadline;
}

/** Rango por defecto para cortes: últimos 12 meses (días 7 y 21). Usado en loadAfterAuth y Commission Cuts. */
export function getDefaultCutDateRange(): { startCutDate: number; endCutDate: number } {
	const now = new Date();
	// end = corte más reciente o próximo: si estamos antes del 7 → 21 del mes anterior; entre 7-21 → 21 del mes actual; después del 21 → 21 del mes actual
	let end: Date;
	if (now.getDate() < 7) {
		end = new Date(now.getFullYear(), now.getMonth() - 1, 21); // 21 del mes anterior
	} else {
		end = new Date(now.getFullYear(), now.getMonth(), 21); // 21 del mes actual (incluye corte del 21)
	}
	const start = new Date(end);
	start.setMonth(start.getMonth() - 12);
	start.setDate(7);
	return {
		startCutDate: start.getTime(),
		endCutDate: end.getTime(),
	};
}

/**
 * Retorna el siguiente corte: mismo día (7 o 21) del mes siguiente.
 * Regla factura tardía: si no se envía factura a tiempo, la comisión pasa
 * al mismo día del mes siguiente (ej. 7 mar → 7 abr, 21 jun → 21 jul).
 * @see docs/domain/commission-cuts.md
 */
export function getNextCutDate(cutDate: number): number {
	const d = new Date(cutDate);
	const day = d.getDate(); // 7 o 21
	const year = d.getFullYear();
	const month = d.getMonth();
	return new Date(year, month + 1, day).getTime();
}
