import { createAction, props } from '@ngrx/store';

import { Tag } from './tag.model';

// Load
export const loadTags = createAction('[Tags] Load');
export const loadTagsSuccess = createAction('[Tags] Load Success', props<{ tags: Tag[] }>());
export const loadTagsFailure = createAction('[Tags] Load Failure', props<{ error: string }>());

// Select
export const selectTag = createAction('[Tags] Select', props<{ tag: Tag }>());

// Create
export const createTag = createAction('[Tags] Create', props<{ tag: Tag }>());
export const createTagSuccess = createAction('[Tags] Create Success', props<{ tag: Tag }>());
export const createTagFailure = createAction('[Tags] Create Failure', props<{ error: string }>());

// Update
export const updateTag = createAction('[Tags] Update', props<{ tag: Tag }>());
export const updateTagSuccess = createAction('[Tags] Update Success', props<{ tag: Tag }>());
export const updateTagFailure = createAction('[Tags] Update Failure', props<{ error: string }>());

// Delete
export const deleteTag = createAction('[Tags] Delete', props<{ uid: string }>());
export const deleteTagSuccess = createAction('[Tags] Delete Success', props<{ uid: string }>());
export const deleteTagFailure = createAction('[Tags] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[Tags] Set Search Term', props<{ searchTerm: string }>());

export const clearTags = createAction('[Tags] Clear Tags');