/** Catálogo de motivos de atraso para comisiones. */
export const COMMISSION_CUT_LATE_REASONS: Record<string, string> = {
	DESGLOSE_NO_ENVIADO_A_TIEMPO: 'El desglose no se envió a la asesora a tiempo',
	FACTURA_NO_RECIBIDA_A_TIEMPO: 'No se recibió factura a tiempo',
};

export function getLateReasonLabel(code: string): string {
	return COMMISSION_CUT_LATE_REASONS[code] ?? code;
}
