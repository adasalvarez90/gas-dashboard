// Interfaces
import { Metadata } from 'src/app/models/metadata.model';
import type { LateReasonEntry } from 'src/app/models/commission-cut-late-reason.model';

//
export interface CommissionPayment extends Metadata {
	contractUid: string;
	trancheUid: string;

	advisorUid: string;
	role: string;

	policyUid?: string;
	/**
	 * Adjustment metadata (never mutates paid payments; use a new ADJUSTMENT entry instead).
	 */
	adjustsPaymentUid?: string;
	adjustmentReason?: string;
	grossCommissionPercent: number;   // ejemplo 9% o 10%
	roleSplitPercent: number;         // porcentaje según matriz
	amount: number;

	paymentType: 'IMMEDIATE' | 'RECURRING' | 'FINAL' | 'ADJUSTMENT';

	dueDate: number;
	cutDate: number;

	/** Corte al que se difirió cuando la factura llega tarde. Si existe, la comisión aparece en ambos cortes. */
	deferredToCutDate?: number;

	paid: boolean;
	paidAt?: number;

	cancelled: boolean;

	installment: number;

	scheme: string;

	/**
	 * Motivo de atraso (mismo catálogo que cortes: desglose / factura / pago) + texto libre opcional,
	 * cuando el fondeo es anterior al corte vigente. Captura en flujo de alta.
	 */
	fundingDeferralReasonCode?: string;
	fundingDeferralReasonText?: string;

	// --- Flujo cortes (verdad híbrida por comisión; Firestore `commissionPayments`) ---
	breakdownSentAt?: number;
	invoiceSentAt?: number;
	sentToPaymentAt?: number;
	receiptSentAt?: number;
	invoiceUrl?: string;
	receiptUrl?: string;
	lateReasons?: LateReasonEntry[];
	/** Pagada fuera de plazo (auditoría / franja naranja). */
	paidLate?: boolean;
	/** Factura tarde → arrastre (además de deferredToCutDate). */
	movedToNextCut?: boolean;
	/** Corte origen cuando se mostró como diferida desde otro corte. */
	workflowOriginalCutDate?: number;
}