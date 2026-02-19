import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as CommissionConfigActions from './commission-config.actions';
import * as fromCommissionConfig from './commission-config.selectors';
import { CommissionConfig } from './commission-config.model';

@Injectable({ providedIn: 'root' })
export class CommissionConfigFacade {
	commissionConfigs$ = this.store.select(fromCommissionConfig.selectAll);
	entities$ = this.store.select(fromCommissionConfig.selectEntities);
	selectedCommissionConfig$ = this.store.select(fromCommissionConfig.selectedCommissionConfig);
	loading$ = this.store.select(fromCommissionConfig.selectLoading);

	constructor(private store: Store) { }

	loadCommissionConfigs() {
		this.store.dispatch(CommissionConfigActions.loadCommissionConfigs());
	}

	selectCommissionConfig(commissionConfig: CommissionConfig) {
		this.store.dispatch(CommissionConfigActions.selectCommissionConfig({ commissionConfig }));
	}

	upsertManyCommissionConfigs(commissionConfigs: {
		role: string;
		source: string;
		percentage: number;
	}[]) {
		this.store.dispatch(CommissionConfigActions.upsertManyCommissionConfigs({ commissionConfigs }));
	}
}
