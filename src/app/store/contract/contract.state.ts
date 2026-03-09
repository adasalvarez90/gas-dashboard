// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { Contract, ContractStatus } from './contract.model';

export function selectId(contract: Contract) {
	//
	return contract.uid as string;
}

export interface State extends EntityState<Contract> {
  searchTerm: string;
  statusFilter: ContractStatus;
  selected: Contract | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<Contract> = createEntityAdapter<Contract>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  statusFilter: 'PENDING',
  selected: null,
  loading: false,
  error: null
});
