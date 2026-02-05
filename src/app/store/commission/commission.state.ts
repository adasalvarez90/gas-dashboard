// Libraries
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Commission } from './commission.model';

export function selectId(commission: Commission) {
	//
	return commission.uid as string;
}

export interface State extends EntityState<Commission> {
  selected: Commission | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<Commission> = createEntityAdapter<Commission>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  selected: null,
  loading: false,
  error: null
});
