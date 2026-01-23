import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
// 
import * as AuthActions from './auth.actions';
import * as fromAuth from './auth.selectors';

@Injectable({
	providedIn: 'root',
})
export class AuthFacade {
	auth$ = this.store.select(fromAuth.selectAuth);
	user$ = this.store.select(fromAuth.selectUser);
	loading$ = this.store.select(fromAuth.selectLoading);
	error$ = this.store.select(fromAuth.selectError);

	constructor(private store: Store) {}

	public login(email: string, password: string) {
		this.store.dispatch(AuthActions.login({ email, password }));
	}

	public logout() {
		this.store.dispatch(AuthActions.logout());
	}

	public restoreSession() {
		this.store.dispatch(AuthActions.restoreSession());
	}
}
