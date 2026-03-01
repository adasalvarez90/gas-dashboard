// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

export type InvestmentSource =
	| 'COMUNIDAD'
	| 'RED_CALIDA'
	| 'DINERO_PROPIO'
	| 'REFERIDORA';

//
export interface Contract extends Metadata {
	investor: string;
	email: string;
	clientAccount: string;

	scheme: 'A' | 'B';
	yieldPercent: number;
	liquidity: number;
	term: 12;

	yieldFrequency: string;
	payments: string;

	source: InvestmentSource;

	signatureDate: number;
	startDate: number;
	endDate: number;

	accountStatus: string;
	signed: boolean;

	docs: boolean;
	docsComments?: string;

	beneficiaries?: string;

	roles: {
		consultant: string;
		kam: string;
		manager: string;
		salesDirector: string;
		operations: string;
		ceo: string;
		referral?: string;
	};
}