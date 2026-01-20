import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Invite } from './invite.model';

export function selectId(invite:Invite) {
  //
  return invite.id as string;
}

export interface State extends EntityState<Invite> {
  searchTerm: string;
  list: Invite[];
  loading: boolean;
  error: string | null;
}

export const adapter: EntityAdapter<Invite> = createEntityAdapter<Invite>({
  selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  list: [],
  loading: false,
  error: null
});
