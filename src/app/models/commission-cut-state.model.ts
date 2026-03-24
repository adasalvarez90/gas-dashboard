import type { LateReasonEntry } from './commission-cut-late-reason.model';

/** Estado del flujo de comisión por asesora y corte */
export type CommissionCutState =
	| 'PENDING'           // Pendiente: sin desglose enviado
	| 'BREAKDOWN_SENT'    // Desglose enviado
	| 'SENT_TO_PAYMENT'   // Enviada a pago (factura enviada)
	| 'PAID';             // Pagada (comprobante recibido)

export interface CommissionCutAdvisorState {
	uid: string;
	cutDate: number;
	advisorUid: string;

	state: CommissionCutState;

	/** Día límite para desglose (7 o 21 del mes) */
	breakdownDeadlineDay?: 7 | 21;

	/** Timestamp en que se envió el desglose */
	breakdownSentAt?: number;

	/** Límite para enviar factura: 2 días hábiles desde breakdownSentAt */
	invoiceDeadline?: number;

	/** Timestamp en que se envió la factura */
	invoiceSentAt?: number;

	/** URL del archivo de factura en Storage */
	invoiceUrl?: string;

	/** Límite para pago: 2 días hábiles desde invoiceSentAt */
	paymentDeadline?: number;

	/** Timestamp en que se recibió el comprobante / se marcó pagado */
	receiptSentAt?: number;

	/** URL del archivo de comprobante en Storage */
	receiptUrl?: string;

	/** Si no se envió factura a tiempo, la comisión pasa al siguiente corte */
	movedToNextCut?: boolean;

	/** Motivos de atraso. Una comisión atrasada puede tener más de uno. */
	lateReasons?: LateReasonEntry[];

	/** true cuando se pagó después del plazo (excepción). Mantiene color de auditoría. */
	paidLate?: boolean;

	/** Corte original cuando se difirió. Para etiqueta "Diferida" y auditoría. */
	originalCutDate?: number;

	/** Corte al que se difirió. La comisión aparece en el corte original (solo lectura) y en este. */
	deferredToCutDate?: number;

	_on?: boolean;
	_create?: number;
	_update?: number;
}
