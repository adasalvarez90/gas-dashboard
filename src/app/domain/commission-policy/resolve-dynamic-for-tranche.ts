import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';
import { normalizeCommissionPolicy } from './commission-policy-normalize';

/**
 * Resolves which dinámica applies to a tranche at funding time.
 *
 * **Manual:** `tranche.assignedDynamicPolicyUid` wins if that policy exists in `policies`
 * (catalog query is typically `_on === true`). Inactive policies are allowed.
 *
 * **Auto:** only `active === true` and `contract.scheme` in normalized `allowedSchemes`.
 * No ventana por fechas: lo operativo es `active`.
 *
 * **Desempate (auto):** mayor `priority`, luego `_create` más reciente.
 *
 * @param _fundedAt reservado por compatibilidad con callers; ya no filtra políticas.
 */
export function resolveDynamicForTranche(
	tranche: Tranche,
	contract: Contract,
	policies: CommissionPolicy[],
	_fundedAt: number
): CommissionPolicy | null {
	const list = policies.filter(p => p && p._on !== false);

	if (tranche.assignedDynamicPolicyUid) {
		const manual = list.find(p => p.uid === tranche.assignedDynamicPolicyUid);
		return manual ?? null;
	}

	const normCandidates = list
		.map(p => ({ raw: p, norm: normalizeCommissionPolicy(p) }))
		.filter(({ raw, norm }) => {
			if (!raw.active) {
				return false;
			}
			return norm.allowedSchemes.includes(contract.scheme);
		});

	if (normCandidates.length === 0) {
		return null;
	}

	normCandidates.sort((a, b) => {
		const pa = a.raw.priority ?? 0;
		const pb = b.raw.priority ?? 0;
		if (pb !== pa) {
			return pb - pa;
		}
		return (b.raw._create ?? 0) - (a.raw._create ?? 0);
	});

	return normCandidates[0].raw;
}
