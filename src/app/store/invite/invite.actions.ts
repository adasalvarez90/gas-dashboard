import { createAction, props } from '@ngrx/store';

import { Invite } from './invite.model';

// Load
export const loadInvites = createAction('[Invites] Load');
export const loadInvitesSuccess = createAction('[Invites] Load Success', props<{ invites: Invite[] }>());
export const loadInvitesFailure = createAction('[Invites] Load Failure', props<{ error: string }>());

// Select
export const selectInvite = createAction('[Invites] Select', props<{ invite: Invite }>());

// Create
export const createInvite = createAction('[Invites] Create', props<{ invite: Invite }>());
export const createInviteSuccess = createAction('[Invites] Create Success', props<{ invite: Invite }>());
export const createInviteFailure = createAction('[Invites] Create Failure', props<{ error: string }>());

// Update
export const updateInviteMetrics = createAction('[Invites] Update invite metrics', props<{ inviteUid: string, changes: Partial<Invite> }>());

export const updateInviteMetricsSuccess = createAction('[Invites] Update Metrics Success', props<{ inviteUid: string; changes: Partial<Invite> }>());

export const updateInviteMetricsFailure = createAction('[Invites] Update Metrics Failure', props<{ error: string }>());
// ===== CANCEL =====
export const cancelInvite = createAction('[Invites] Cancel', props<{ inviteUid: string }>());
// ===== SEND =====
export const sendInviteEmail = createAction('[Invite] Send Invite Email', props<{ invite: Invite }>());

export const sendInviteEmailSuccess = createAction('[Invite] Send Invite Email Success', props<{ inviteUid: string }>());

export const sendInviteEmailFailure = createAction('[Invite] Send Invite Email Failure', props<{ error: string }>());

// ===== RESEND =====
export const resendInvite = createAction('[Invites] Resend', props<{ invite: Invite }>());
// Search
export const setSearchTerm = createAction('[Invites] Set Search Term', props<{ searchTerm: string }>());

export const clearInvites = createAction('[Invites] Clear Invites');