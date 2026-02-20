// Libraries
import { EntityState, EntityAdapter, createEntityAdapter, Dictionary } from '@ngrx/entity';
import { CommissionPayment } from './commission-payment.model';

export function selectId(commissionPayment: CommissionPayment) {
	//
	return commissionPayment.uid as string;
}

export interface State extends EntityState<CommissionPayment> {
  searchTerm: string;
  selected: CommissionPayment | null;
  loading: boolean;
  error: string | null;
}

// Create the entity adapter
export const adapter: EntityAdapter<CommissionPayment> = createEntityAdapter<CommissionPayment>({
	selectId
});

export const initialState: State = adapter.getInitialState({
  searchTerm: '',
  selected: null,
  loading: false,
  error: null
});
