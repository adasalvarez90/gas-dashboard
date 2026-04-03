import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';

/**
 * Resolves which dinámica applies to a tranche at funding time.
 *
 * **Solo asignación explícita:** no hay auto–selección por `active` / prioridad / esquema.
 * El usuario elige en la UI del tranche (`assignedDynamicPolicyUid`); si está vacío, no aplica ninguna dinámica.
 *
 * La política encontrada puede estar **inactiva** en el catálogo si el usuario la asignó a mano.
 *
 * `contract` y `_fundedAt` se conservan en la firma por compatibilidad con callers.
 */
export function resolveDynamicForTranche(
	tranche: Tranche,
	_contract: Contract,
	policies: CommissionPolicy[],
	_fundedAt: number
): CommissionPolicy | null {
	const list = policies.filter(p => p && p._on !== false);

	if (!tranche.assignedDynamicPolicyUid) {
		return null;
	}

	return list.find(p => p.uid === tranche.assignedDynamicPolicyUid) ?? null;
}
