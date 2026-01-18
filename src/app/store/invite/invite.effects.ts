import { AppComponent } from './../../app.component';
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { withLatestFrom, exhaustMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import * as InviteActions from './invite.actions';
import { InviteFirestoreService } from '../../services/invite-firestore.service';
import { AuthFacade } from 'src/app/store/auth/auth.facade';

@Injectable()
export class InviteEffects {
  constructor(
	private actions$: Actions,
	private inviteFS: InviteFirestoreService,
	private authFacade: AuthFacade,
  ) {}

  loadInvites$ = createEffect(() =>
	this.actions$.pipe(
	  ofType(InviteActions.loadInvites),
	  withLatestFrom(this.authFacade.user$),
	  exhaustMap(([_, user]) =>
		this.inviteFS.getInvites().then(
		  invites => InviteActions.loadInvitesSuccess({ invites }),
		  err => InviteActions.loadInvitesFailure({ error: err.message }),
		),
	  ),
	),
  );

  createInvite$ = createEffect(() =>
	this.actions$.pipe(
	  ofType(InviteActions.createInvite),
	  withLatestFrom(this.authFacade.user$),
	  exhaustMap(([{ email, role }, user]) =>
		this.inviteFS.createInvite(email, role, user!.uid).then(
		  invite => InviteActions.createInviteSuccess({ invite }),
		  err => InviteActions.createInviteFailure({ error: err.message }),
		),
	  ),
	),
  );

  resendInvite$ = createEffect(
	() =>
	  this.actions$.pipe(
		ofType(InviteActions.resendInvite),
		exhaustMap(({ invite }) => this.inviteFS.markResent(invite)),
	  ),
	{ dispatch: false },
  );

  cancelInvite$ = createEffect(
	() =>
	  this.actions$.pipe(
		ofType(InviteActions.cancelInvite),
		exhaustMap(({ inviteId }) => this.inviteFS.cancelInvite(inviteId)),
	  ),
	{ dispatch: false },
  );
}
