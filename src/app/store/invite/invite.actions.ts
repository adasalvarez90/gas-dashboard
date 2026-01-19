import { createAction, props } from '@ngrx/store';
import { Invite } from './invite.model';

// ===== LOAD =====
export const loadInvites = createAction('[Invites] Load');

export const loadInvitesSuccess = createAction('[Invites] Load Success', props<{ invites: Invite[] }>());

export const loadInvitesFailure = createAction('[Invites] Load Failure', props<{ error: string }>());

// ===== CREATE =====
export const createInvite = createAction('[Invites] Create', props<{ email: string; role: 1 | 2 }>());

export const createInviteSuccess = createAction('[Invites] Create Success', props<{ invite: Invite }>());

export const createInviteFailure = createAction('[Invites] Create Failure', props<{ error: string }>());

// ===== RESEND =====
export const resendInvite = createAction('[Invites] Resend', props<{ invite: Invite }>());

// ===== CANCEL =====
export const cancelInvite = createAction('[Invites] Cancel', props<{ inviteId: string }>());

// ===== CHANGE STATUS =====
export const changeStatus = createAction('[Invites] Change status', props<{ inviteId: string, status: string }>());

// Search
export const setSearchTerm = createAction('[Invites] Set Search Term', props<{ searchTerm: string }>());
