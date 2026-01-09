import { ActionReducerMap,  } from '@ngrx/store';
import { State } from './store.state';
import { routerReducer } from '@ngrx/router-store';

export const reducers: ActionReducerMap<State> = {
	router: routerReducer
};
