import { createAction, props } from '@ngrx/store';

import { Advisor } from './advisor.model';

// Load
export const loadAdvisors = createAction('[Advisors] Load');
export const loadAdvisorsSuccess = createAction('[Advisors] Load Success', props<{ advisors: Advisor[] }>());
export const loadAdvisorsFailure = createAction('[Advisors] Load Failure', props<{ error: string }>());

// Select
export const selectAdvisor = createAction('[Advisors] Select', props<{ advisor: Advisor }>());

// Create
export const createAdvisor = createAction('[Advisors] Create', props<{ advisor: Advisor }>());
export const createAdvisorSuccess = createAction('[Advisors] Create Success', props<{ advisor: Advisor }>());
export const createAdvisorFailure = createAction('[Advisors] Create Failure', props<{ error: string }>());

// Update
export const updateAdvisor = createAction('[Advisors] Update', props<{ advisor: Advisor }>());
export const updateAdvisorSuccess = createAction('[Advisors] Update Success', props<{ advisor: Advisor }>());
export const updateAdvisorFailure = createAction('[Advisors] Update Failure', props<{ error: string }>());

// Delete
export const deleteAdvisor = createAction('[Advisors] Delete', props<{ uid: string }>());
export const deleteAdvisorSuccess = createAction('[Advisors] Delete Success', props<{ uid: string }>());
export const deleteAdvisorFailure = createAction('[Advisors] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[Advisors] Set Search Term', props<{ searchTerm: string }>());

export const clearAdvisors = createAction('[Advisors] Clear Advisors');