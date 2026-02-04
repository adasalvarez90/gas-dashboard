import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './tag.state';
import * as TagsActions from './tag.actions';

export const tagReducer = createReducer(
	initialState,

	on(TagsActions.loadTags, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(TagsActions.loadTagsSuccess, (state, { tags }) => adapter.setAll(tags, { ...state, selected: null, loading: false })),

	on(TagsActions.loadTagsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(TagsActions.selectTag, (state, { tag }) => ({ ...state, selected: tag, })),

	on(TagsActions.createTagSuccess, (state, { tag }) => adapter.addOne(tag, state)),

	on(TagsActions.updateTagSuccess, (state, { tag }) => adapter.updateOne({ id: tag.uid, changes: tag, }, { ...state, selected: tag, loading: false, })),

	on(TagsActions.deleteTagSuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(TagsActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(TagsActions.clearTags, () => initialState)
);
