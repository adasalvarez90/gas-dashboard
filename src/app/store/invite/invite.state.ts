import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Invite } from './invite.model';

export function selectId(invite: Invite) {
  //
  return invite.uid as string;
}

export interface State extends EntityState<Invite> {
  searchTerm: string;
  selected: Invite | null;
  loading: boolean;
  error: string | null;
}

export const adapter: EntityAdapter<Invite> = createEntityAdapter<Invite>({
  selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
