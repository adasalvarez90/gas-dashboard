// Libraries
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { CommissionConfig } from './commission-config.model';

export function selectId(commissionConfig: CommissionConfig) {
	//
	return commissionConfig.uid as string;
}

export interface State extends EntityState<CommissionConfig> {
  selected: CommissionConfig | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<CommissionConfig> = createEntityAdapter<CommissionConfig>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  selected: null,
  loading: false,
  error: null
});
