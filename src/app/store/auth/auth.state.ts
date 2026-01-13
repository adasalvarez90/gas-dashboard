// Models
import { Auth } from './auth.model';
import { User } from 'src/app/store/user/user.model';
import { ErrorMessage } from 'src/app/models/error-message.model';
/**
 * STATE
 */
// Define the State interface based on the entity and order interfaces
export interface State extends Auth {
  user: Partial<User>;
  loading: boolean;
  error: any;
}
// Define the feature initial state
export const initialState: State = {
  user: null,
  loading: false,
  error: null,
};
