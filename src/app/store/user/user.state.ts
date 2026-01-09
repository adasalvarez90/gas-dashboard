// Libraries
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
// Models
import { User } from './user.model';
import { ErrorMessage } from 'src/app/models/error-message.model';
/**
 * STATE
 */
//
export function selectId(user: User) {
	//
	return user._code as number;
}
// Define the State interface based on the entity and order interfaces
export interface State extends EntityState<User> {
	search: string;
	selectedUserId: number;
	loaded: boolean;
	error: ErrorMessage;
}
// Create the entity adapter
export const adapter: EntityAdapter<User> = createEntityAdapter<User>({
	selectId
});
// Define the feature initial state
export const initialState: State = adapter.getInitialState({
	search: '',
	selectedUserId: null,
	loaded: false,
	error: null
});
