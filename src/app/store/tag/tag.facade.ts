import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as TagActions from './tag.actions';
import * as fromTag from './tag.selectors';
import { Tag } from './tag.model';

@Injectable({ providedIn: 'root' })
export class TagFacade {
	tags$ = this.store.select(fromTag.selectFiltered);
	entities$ = this.store.select(fromTag.selectEntities);
	selectedTag$ = this.store.select(fromTag.selectedTag);
	loading$ = this.store.select(fromTag.selectLoading);
	search$ = this.store.select(fromTag.selectSearch);
	total$ = this.store.select(fromTag.selectTotal);

	constructor(private store: Store) {}

	loadTags() {
		this.store.dispatch(TagActions.loadTags());
	}

	selectTag(tag: Tag) {
		this.store.dispatch(TagActions.selectTag({ tag }));
	}

	createTag(tag: Tag) {
		this.store.dispatch(TagActions.createTag({ tag }));
	}

	updateTag(tag: Tag) {
		this.store.dispatch(TagActions.updateTag({ tag }));
	}

	deleteTag(uid: string) {
		this.store.dispatch(TagActions.deleteTag({ uid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(TagActions.setSearchTerm({ searchTerm }));
	}
}
