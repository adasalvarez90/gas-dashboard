// Libraries
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { User } from './user.model';

export function selectId(user: User) {
	//
	return user.uid as string;
}

export interface State extends EntityState<User> {
  searchTerm: string;
  selected: User | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<User> = createEntityAdapter<User>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
