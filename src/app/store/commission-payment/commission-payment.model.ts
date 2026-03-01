// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface CommissionPayment extends Metadata {
	contractUid: string;
	trancheUid: string;

	advisorUid: string;
	role: string;

	grossCommissionPercent: number;   // ejemplo 9% o 10%
	roleSplitPercent: number;         // porcentaje según matriz
	amount: number;

	paymentType: 'IMMEDIATE' | 'RECURRING' | 'FINAL';

	dueDate: number;
	cutDate: number;

	paid: boolean;
	paidAt?: number;

	policyUid?: string;
}