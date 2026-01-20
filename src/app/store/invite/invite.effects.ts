import { AppComponent } from './../../app.component';
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { withLatestFrom, map, exhaustMap, switchMap, catchError } from 'rxjs/operators';
import { of, from } from 'rxjs';

import * as InviteActions from './invite.actions';
import { InviteFirestoreService } from '../../services/invite-firestore.service';
import { AuthFacade } from 'src/app/store/auth/auth.facade';

// Services
import { InviteEmailService } from 'src/app/services/invite-email.service'

// Utils
import { buildInviteLink } from '../../utils/invite-link.util';

@Injectable()
export class InviteEffects {
	constructor(
		private actions$: Actions,
		private inviteFS: InviteFirestoreService,
		private authFacade: AuthFacade,
		private emailService: InviteEmailService
	) { }

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

	sendInviteEmail$ = createEffect(() =>
		this.actions$.pipe(
			ofType(InviteActions.sendInviteEmail),
			exhaustMap(({ invite }) => {

				if (invite.status !== 'pending') {
					return of(InviteActions.sendInviteEmailFailure({
						error: 'Invite cannot be sent'
					}));
				}

				const link = buildInviteLink(invite);

				return from(this.emailService.sendInvite(invite, link)).pipe(
					switchMap(() => [
						InviteActions.sendInviteEmailSuccess({ inviteId: invite.id }),
						InviteActions.updateInviteMetrics({
							inviteId: invite.id,
							changes: {
								resendCount: invite.resendCount + 1,
								lastSentAt: Date.now(),
							},
						}),
					]),
					catchError(err =>
						of(InviteActions.sendInviteEmailFailure({ error: err.message }))
					)
				);
			})
		)
	);


	resendInvite$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(InviteActions.resendInvite),
				exhaustMap(({ invite }) => this.inviteFS.markResent(invite)),
			),
		{ dispatch: false },
	);

	updateInviteMetrics$ = createEffect(() =>
		this.actions$.pipe(
			ofType(InviteActions.updateInviteMetrics),
			switchMap(({ inviteId, changes }) =>
				from(this.inviteFS.updateInviteMetrics(inviteId, changes)).pipe(
					map(() =>
						InviteActions.updateInviteMetricsSuccess({ inviteId, changes })
					),
					catchError((err) =>
						of(InviteActions.updateInviteMetricsFailure({ error: err.message }))
					)
				)
			)
		)
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
