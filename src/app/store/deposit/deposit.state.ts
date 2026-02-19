// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { Deposit } from './deposit.model';

export function selectId(deposit: Deposit) {
	//
	return deposit.uid as string;
}

export interface State extends EntityState<Deposit> {
  searchTerm: string;
  selected: Deposit | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<Deposit> = createEntityAdapter<Deposit>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
