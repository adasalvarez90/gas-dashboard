import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, catchError, withLatestFrom, mergeMap } from 'rxjs/operators';
import { from, of } from 'rxjs';

import * as InviteActions from './invite.actions';
import * as AuthActions from '../auth/auth.actions';
import { InviteFirestoreService } from 'src/app/services/invite-firestore.service';
import { AuthFacade } from '../auth/auth.facade';
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

	// 🔎 Load invites
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

	loadInvitesOnLogin$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AuthActions.loginSuccess),
			map(() => InviteActions.loadInvites()),
		),
	);

	// ➕ Create invite
	createInvite$ = createEffect(() =>
		this.actions$.pipe(
			ofType(InviteActions.createInvite),
			exhaustMap(({ invite }) =>
				this.inviteFS.createInvite(invite).then(
					() => InviteActions.createInviteSuccess({ invite }),
					(err) => InviteActions.createInviteFailure({ error: err.message }),
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
						InviteActions.sendInviteEmailSuccess({ inviteUid: invite.uid }),
						InviteActions.updateInviteMetrics({
							inviteUid: invite.uid,
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
			exhaustMap(({ inviteUid, changes }) =>
				this.inviteFS.updateInviteMetrics(inviteUid, changes).then(
					() => InviteActions.updateInviteMetricsSuccess({ inviteUid, changes }),
					(err) => InviteActions.updateInviteMetricsFailure({ error: err.message }),
				),
			),
		),
	);

	expireInvites$ = createEffect(() =>
		this.actions$.pipe(
			ofType(InviteActions.loadInvitesSuccess),
			mergeMap(({ invites }) =>
				invites
					.filter(invite =>
						invite.status !== 'expired' &&
						Date.now() > invite.expiresAt
					)
					.map(invite =>
						InviteActions.updateInviteMetrics({
							inviteUid: invite.uid,
							changes: {
								status: 'expired',
								expiredAt: Date.now()
							}
						})
					)
			)
		)
	);

	cancelInvite$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(InviteActions.cancelInvite),
				exhaustMap(({ inviteUid }) => this.inviteFS.cancelInvite(inviteUid)),
			),
		{ dispatch: false },
	);
}
