import { resolveDynamicForTranche } from './resolve-dynamic-for-tranche';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';

describe('resolveDynamicForTranche', () => {
	const contractA: Contract = {
		uid: 'c1',
		scheme: 'A',
		yieldPercent: 15,
	} as Contract;

	const fundedAt = 1000;

	function policy(p: Partial<CommissionPolicy>): CommissionPolicy {
		return {
			uid: p.uid ?? 'p',
			name: p.name ?? 'Dyn',
			active: p.active ?? true,
			allowedSchemes: p.allowedSchemes ?? ['A'],
			rules: p.rules ?? [],
			_on: p._on ?? true,
			_create: p._create,
			priority: p.priority,
			...p,
		} as CommissionPolicy;
	}

	it('returns null when no policies', () => {
		const tranche = { uid: 't1', assignedDynamicPolicyUid: undefined } as Tranche;
		expect(resolveDynamicForTranche(tranche, contractA, [], fundedAt)).toBeNull();
	});

	it('manual assignment wins even if inactive', () => {
		const manual = policy({
			uid: 'manual',
			active: false,
			allowedSchemes: ['A'],
		});
		const auto = policy({ uid: 'auto', active: true });
		const tranche = { uid: 't1', assignedDynamicPolicyUid: 'manual' } as Tranche;
		expect(resolveDynamicForTranche(tranche, contractA, [manual, auto], fundedAt)).toBe(manual);
	});

	it('no manual uid: never picks an active policy from catalog', () => {
		const inactive = policy({ uid: 'i', active: false });
		const active = policy({ uid: 'a', active: true, _create: 1 });
		const tranche = {} as Tranche;
		expect(resolveDynamicForTranche(tranche, contractA, [inactive, active], fundedAt)).toBeNull();
	});

	it('no manual uid: ignores policies that would match scheme if auto existed', () => {
		const bOnly = policy({ uid: 'b', allowedSchemes: ['B'], active: true });
		const tranche = {} as Tranche;
		expect(resolveDynamicForTranche(tranche, contractA, [bOnly], fundedAt)).toBeNull();
	});

	it('manual uid not in catalog returns null', () => {
		const p1 = policy({ uid: 'p1', active: true });
		const tranche = { assignedDynamicPolicyUid: 'missing' } as Tranche;
		expect(resolveDynamicForTranche(tranche, contractA, [p1], fundedAt)).toBeNull();
	});
});
