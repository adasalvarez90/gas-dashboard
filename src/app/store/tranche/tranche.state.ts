// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { Tranche } from './tranche.model';

export function selectId(tranche: Tranche) {
	//
	return tranche.uid as string;
}

export interface State extends EntityState<Tranche> {
  searchTerm: string;
  selected: Tranche | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<Tranche> = createEntityAdapter<Tranche>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
