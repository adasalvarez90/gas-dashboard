// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { Tag } from './tag.model';

export function selectId(tag: Tag) {
	//
	return tag.uid as string;
}

export interface State extends EntityState<Tag> {
  searchTerm: string;
  selected: Tag | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<Tag> = createEntityAdapter<Tag>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
