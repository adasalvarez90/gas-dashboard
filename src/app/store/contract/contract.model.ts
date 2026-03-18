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

export interface ContractBeneficiary {
	nombre: string;
	/** Fecha de nacimiento yyyy-mm-dd */
	fechaNacimiento: string;
	/** Porcentaje 0–100; varios beneficiarios deben sumar 100 */
	porcentaje: number;
}

//
export interface Contract extends Metadata {
	investor: string;
	email: string;
	/** RFC del inversionista */
	investorRfc: string;
	/** Domicilio del inversionista */
	domicilio: string;
	/** Cuenta para fondeo / depósitos */
	fundingAccount: string;
	/** Institución bancaria de la cuenta de fondeo */
	fundingBankInstitution: string;
	/** Cuenta para devoluciones y rendimientos */
	returnsAccount: string;
	/** Institución bancaria de la cuenta de rendimientos */
	returnsBankInstitution: string;

	scheme: 'A' | 'B';
	yieldPercent: number;
	liquidity: number;
	term: 12;

	yieldFrequency: string;
	/** Calculado al fondear tranche 1 (día 15 o 30); no editar manualmente */
	payments: string;

	source: InvestmentSource;

	/** Fecha de firma del contrato; solo tiene valor cuando signed === true. */
	signatureDate?: number;
	/** Capital del primer tranche; requerido cuando signed === true (para crear tranche 1). */
	initialCapital?: number;
	startDate?: number;
	endDate?: number;

	/** Derivado del estado del contrato; no editar manualmente */
	accountStatus: string;
	signed: boolean;

	docs: boolean;
	docsComments?: string;

	beneficiaries?: ContractBeneficiary[];

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
