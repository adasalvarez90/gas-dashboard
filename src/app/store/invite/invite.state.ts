import { Invite } from './invite.model';

export interface State {
  list: Invite[];
  loading: boolean;
  error: string | null;
}

export const initialState: State = {
  list: [],
  loading: false,
  error: null,
};
