// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

//
export interface Tranche extends Metadata {
	contractUid: string;

	amount: number;

	/**
	 * Fecha de firma del tranche/anexo (contrato o anexo firmado).
	 * Tranche 1: suele ser la fecha de firma del contrato. Anexos: fecha en que se firma el anexo.
	 */
	signedAt?: number;
	/**
	 * Fecha de registro de negocio (opcional; no necesariamente igual a _create).
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

	/**
	 * Dinámica especial asignada manualmente al tranche (opcional).
	 * Gana sobre la auto-asignación; puede apuntar a una dinámica inactiva del catálogo.
	 */
	assignedDynamicPolicyUid?: string | null;
}
