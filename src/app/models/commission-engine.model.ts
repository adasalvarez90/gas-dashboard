export interface CommissionRoleSplit {
	role: string;
	advisorUid: string;
	percent: number; // porcentaje dentro del reparto
}

export interface CommissionPaymentDraft {
	contractUid: string;
	trancheUid: string;

	advisorUid: string;
	role: string;
	source: string;

	policyUid?: string;

	amount: number;

	installment: number;

	dueDate: number;
	cutDate: number;

	scheme: string;

	grossCommissionPercent: number;
	roleSplitPercent: number;

	paymentType: 'IMMEDIATE' | 'RECURRING' | 'FINAL';
}