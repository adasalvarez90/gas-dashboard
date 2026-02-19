import { createAction, props } from '@ngrx/store';

import { CommissionConfig } from './commission-config.model';

// Load
export const loadCommissionConfigs = createAction('[CommissionConfigs] Load');
export const loadCommissionConfigsSuccess = createAction('[CommissionConfigs] Load Success', props<{ commissionConfigs: CommissionConfig[] }>());
export const loadCommissionConfigsFailure = createAction('[CommissionConfigs] Load Failure', props<{ error: string }>());

// Select
export const selectCommissionConfig = createAction('[CommissionConfigs] Select', props<{ commissionConfig: CommissionConfig }>());

// Upsert Many
export const upsertManyCommissionConfigs = createAction('[CommissionConfig] Upsert Many', props<{ commissionConfigs: { role: string; source: string; percentage: number }[] }>());
export const upsertManyCommissionConfigsSuccess = createAction('[CommissionConfig] Upsert Many Success', props<{ commissionConfigs: CommissionConfig[] }>());
export const upsertManyCommissionConfigsFailure = createAction('[CommissionConfig] Upsert Many Failure', props<{ error: any }>());

export const clearCommissionConfigs = createAction('[CommissionConfigs] Clear CommissionConfigs');