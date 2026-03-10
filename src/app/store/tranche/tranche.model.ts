// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Tranche extends Metadata {
	contractUid: string;

	amount: number;

	/**
	 * Fecha de registro de negocio (no necesariamente igual a _create).
	 * Se captura desde UI o se autogenera al crear el tranche.
	 */
	registeredAt?: number;

	totalDeposited: number;

	/**
	 * Último timestamp de depósito registrado para este tranche.
	 * Se usa para derivar fundedAt cuando el fondeo ocurre por enmienda de amount (regla B).
	 */
	lastDepositAt?: number;

	funded: boolean;
	fundedAt?: number;

	/**
	 * Historial de enmiendas de monto (antes de funded=true).
	 * Mantiene trazabilidad sin borrar información.
	 */
	amountAmendments?: Array<{
		at: number;
		from: number;
		to: number;
		reason?: string;
	}>;

	sequence: number; // 1 = inicial, 2 = anexo1, 3 = anexo2
}
