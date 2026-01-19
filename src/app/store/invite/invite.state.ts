import { Invite } from './invite.model';

export interface State {
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
};
