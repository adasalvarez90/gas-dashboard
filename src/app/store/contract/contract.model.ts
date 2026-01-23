// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Contract extends Metadata {
	advisorUid: string;
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
}