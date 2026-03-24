/** Step del flujo en que ocurrió el retraso */
export type LateReasonStep = 'DESGLOSE' | 'FACTURA' | 'PAGO';

/** Entrada de motivo de atraso con catálogo + texto libre */
export interface LateReasonEntry {
	step: LateReasonStep;
	reason: string;  // código del catálogo (obligatorio)
	text?: string;   // texto libre opcional
	at?: number;
}

/** Catálogo de motivos de atraso para comisiones. */
export const COMMISSION_CUT_LATE_REASONS: Record<string, string> = {
	DESGLOSE_NO_ENVIADO_A_TIEMPO: 'El desglose no se envió a la asesora a tiempo',
	FACTURA_NO_RECIBIDA_A_TIEMPO: 'No se recibió factura a tiempo',
	PAGO_NO_REALIZADO_A_TIEMPO: 'El pago no se realizó a tiempo',
};

/** Códigos de motivo por step para el modal */
export const LATE_REASON_CODES_BY_STEP: Record<LateReasonStep, string[]> = {
	DESGLOSE: ['DESGLOSE_NO_ENVIADO_A_TIEMPO'],
	FACTURA: ['FACTURA_NO_RECIBIDA_A_TIEMPO'],
	PAGO: ['PAGO_NO_REALIZADO_A_TIEMPO'],
};

/** Mismos motivos de atraso que en cortes (desglose / factura / pago) + texto libre al capturar diferimiento por fondeo. */
export const LATE_REASON_CODES_FOR_FUNDING_CAPTURE: readonly string[] = [
	'DESGLOSE_NO_ENVIADO_A_TIEMPO',
	'FACTURA_NO_RECIBIDA_A_TIEMPO',
	'PAGO_NO_REALIZADO_A_TIEMPO',
];

export function getLateReasonLabel(code: string): string {
	return COMMISSION_CUT_LATE_REASONS[code] ?? code;
}

/** Normaliza lateReasons a LateReasonEntry[] (compatibilidad con formato legacy string[]) */
export function normalizeLateReasons(raw: unknown): LateReasonEntry[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw
			.filter(Boolean)
			.map((item): LateReasonEntry | null => {
				if (typeof item === 'object' && item !== null && 'step' in item && 'reason' in item) {
					return item as LateReasonEntry;
				}
				if (typeof item === 'string') {
					const step: LateReasonStep =
						item === 'FACTURA_NO_RECIBIDA_A_TIEMPO' ? 'FACTURA' :
						item === 'PAGO_NO_REALIZADO_A_TIEMPO' ? 'PAGO' : 'DESGLOSE';
					return { step, reason: item };
				}
				return null;
			})
			.filter((e): e is LateReasonEntry => e !== null);
	}
	return [];
}
