// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { Advisor } from './advisor.model';

export function selectId(advisor: Advisor) {
	//
	return advisor.uid as string;
}

export interface State extends EntityState<Advisor> {
  searchTerm: string;
  ids: string[];
  entities: Record<string, Advisor>;
  selected: Advisor | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<Advisor> = createEntityAdapter<Advisor>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
