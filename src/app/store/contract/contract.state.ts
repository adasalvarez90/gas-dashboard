// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { Contract } from './contract.model';

export function selectId(contract: Contract) {
	//
	return contract.uid as string;
}

export interface State extends EntityState<Contract> {
  searchTerm: string;
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
  selected: null,
  loading: false,
  error: null
});
