import { CommissionPayment } from '../store/commission-payment/commission-payment.model';

export interface AdvisorCutSummary {
	advisorUid: string;
	advisorName: string;
	cutDate: number;
	totalAmount: number;
	pendingAmount: number;
	paidAmount: number;
	payments: CommissionPayment[];
	breakdown: { paymentType: string; amount: number; count: number }[];
	scheme: string;
	contractUids: string[];
}
