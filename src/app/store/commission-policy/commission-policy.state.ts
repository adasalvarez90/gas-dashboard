// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { CommissionPolicy } from './commission-policy.model';

export function selectId(commissionPolicy: CommissionPolicy) {
	//
	return commissionPolicy.uid as string;
}

export interface State extends EntityState<CommissionPolicy> {
  searchTerm: string;
  selected: CommissionPolicy | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<CommissionPolicy> = createEntityAdapter<CommissionPolicy>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
