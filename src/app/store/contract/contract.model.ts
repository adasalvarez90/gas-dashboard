// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

export type InvestmentSource =
	| 'COMUNIDAD'
	| 'RED_CALIDA'
	| 'DINERO_PROPIO'
	| 'REFERIDORA';

export type ContractStatus =
	| 'PENDING'        // creado pero sin fondeo completo
	| 'ACTIVE'       // al menos un tranche fondeado
	| 'FINISHED'     // vencido automáticamente
	| 'CANCELLED';   // cancelado manualmente

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

	/** Fecha de firma del contrato; solo tiene valor cuando signed === true. */
	signatureDate?: number;
	/** Capital del primer tranche; requerido cuando signed === true (para crear tranche 1). */
	initialCapital?: number;
	startDate?: number; // se define cuando primer tranche fondea
	endDate?: number;   // startDate + 12 meses

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

	contractStatus: ContractStatus;
	cancelledAt?: number;
}