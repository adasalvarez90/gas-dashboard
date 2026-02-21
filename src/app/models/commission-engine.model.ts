export interface CommissionRoleSplit {
	role: string;
	advisorUid: string;
	percent: number; // porcentaje dentro del reparto
}

export interface CommissionPaymentDraft {
	contractUid: string;
	advisorUid: string;

	role: string;
	source: string;

	amount: number;

	installment: number;
	cutDate: number;

	scheme: string;
}