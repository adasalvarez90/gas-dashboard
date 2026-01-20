import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { from, of } from 'rxjs';

import * as AdvisorActions from './advisor.actions';
import * as AuthActions from '../auth/auth.actions';
import { AdvisorFirestoreService } from 'src/app/services/advisor-firestore.service';
import { AuthFacade } from '../auth/auth.facade';
import { Advisor } from './advisor.model';

@Injectable()
export class AdvisorEffects {
	constructor(
		private actions$: Actions,
		private advisorFS: AdvisorFirestoreService,
		private authFacade: AuthFacade,
	) { }

	// 🔎 Load advisors
	loadAdvisors$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.loadAdvisors),
			withLatestFrom(this.authFacade.user$),
			switchMap(([_, user]) =>
				this.advisorFS.getAdvisors().then(
					advisors => AdvisorActions.loadAdvisorsSuccess({ advisors }),
					err => AdvisorActions.loadAdvisorsFailure({ error: err.message }),
				),
			),
		),
	);

	loadAdvisorsOnLogin$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AuthActions.loginSuccess),
			map(() => AdvisorActions.loadAdvisors()),
		),
	);

	// ➕ Create advisor
	createAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.createAdvisor),
			exhaustMap(({ advisor }) =>
				this.advisorFS.createAdvisor(advisor).then(
					() => AdvisorActions.createAdvisorSuccess({ advisor }),
					(err) => AdvisorActions.createAdvisorFailure({ error: err.message }),
				),
			),
		),
	);

	// ✏️ Update advisor
	updateAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.updateAdvisor),
			exhaustMap(({ advisor }) =>
				this.advisorFS.updateAdvisor(advisor).then(
					() => AdvisorActions.updateAdvisorSuccess({ advisor }),
					(err) => AdvisorActions.updateAdvisorFailure({ error: err.message }),
				),
			),
		),
	);

	// 🗑️ Delete advisor
	deleteAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.deleteAdvisor),
			exhaustMap(({ uid }) =>
				this.advisorFS.deleteAdvisor(uid).then(
					() => AdvisorActions.deleteAdvisorSuccess({ uid }),
					(err) => AdvisorActions.deleteAdvisorFailure({ error: err.message }),
				),
			),
		),
	);
}
