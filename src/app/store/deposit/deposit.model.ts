// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

/** Identificador de cuenta origen. 'no_especificada' = cuenta no contemplada en el contrato. */
export type SourceAccountId = 'funding' | 'returns' | 'no_especificada';

export const SOURCE_ACCOUNT_NO_ESPECIFICADA: SourceAccountId = 'no_especificada';

export function isDepositSourceValid(sourceAccount: SourceAccountId | undefined): boolean {
	return sourceAccount !== undefined && sourceAccount !== SOURCE_ACCOUNT_NO_ESPECIFICADA;
}

export interface Deposit extends Metadata {
	contractUid: string;
	trancheUid: string;

	amount: number;
	/** Cuenta origen del depósito. Obligatorio en depósitos nuevos. Depósitos legacy sin este campo se tratan como no_especificada. */
	sourceAccount?: SourceAccountId;

	depositedAt: number;
}