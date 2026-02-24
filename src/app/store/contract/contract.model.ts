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
	signature: string;
	deposit: string;
	depositAccount: string;
	capitalMXN: number;
	yieldPercent: number;
	liquidity: number;
	term: number;
	yieldFrequency: string;
	payments: string;
	accountStatus: string;
	scheme: string;
	docs: boolean;
	docsComments: string;
	email: string;
	clientAccount: string;
	beneficiaries: string;
	signed: boolean;
	regularComision: number;
	dinamicComision: number;
	source: InvestmentSource;
	fullyFundedAt?: number;

	roles: {
		consultant?: string;
		kam?: string;
		manager?: string;
		salesDirector?: string;
		operations?: string;
		ceo?: string;
	};
}