import type { Contract } from 'src/app/store/contract/contract.model';

const ROLE_KEYS = ['consultant', 'kam', 'manager', 'salesDirector', 'operations', 'ceo'] as const;

/** UIDs de asesores en `contract.roles` (excluye `referral`, que suele ser texto). */
export function collectParticipantAdvisorUidsFromRoles(roles: Contract['roles'] | null | undefined): string[] {
	if (!roles) return [];
	const out: string[] = [];
	for (const k of ROLE_KEYS) {
		const u = roles[k]?.trim();
		if (u) out.push(u);
	}
	return [...new Set(out)];
}
