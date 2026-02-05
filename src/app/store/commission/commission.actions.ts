import { createAction, props } from '@ngrx/store';

import { Commission } from './commission.model';

// Load
export const loadCommissions = createAction('[Commissions] Load');
export const loadCommissionsSuccess = createAction('[Commissions] Load Success', props<{ commissions: Commission[] }>());
export const loadCommissionsFailure = createAction('[Commissions] Load Failure', props<{ error: string }>());

// Select
export const selectCommission = createAction('[Commissions] Select', props<{ commission: Commission }>());

// Upsert Many
export const upsertManyCommissions = createAction('[Commission] Upsert Many', props<{ commissions: { role: string; source: string; percentage: number }[] }>());
export const upsertManyCommissionsSuccess = createAction('[Commission] Upsert Many Success', props<{ commissions: Commission[] }>());
export const upsertManyCommissionsFailure = createAction('[Commission] Upsert Many Failure', props<{ error: any }>());

export const clearCommissions = createAction('[Commissions] Clear Commissions');