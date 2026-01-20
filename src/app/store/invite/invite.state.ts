import { Invite } from './invite.model';
import { createEntityAdapter, EntityState } from '@ngrx/entity';

export interface State extends EntityState<Invite> {
  searchTerm: string;
  list: Invite[];
  loading: boolean;
  error: string | null;
}

export const initialState: State = {
  searchTerm: '',
  list: [],
  loading: false,
  error: null,
  ids: [],
  entities: undefined
};
