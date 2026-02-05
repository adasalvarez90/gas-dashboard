import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as AdvisorActions from './advisor.actions';
import * as fromAdvisor from './advisor.selectors';
import { Advisor } from './advisor.model';

@Injectable({ providedIn: 'root' })
export class AdvisorFacade {
	advisors$ = this.store.select(fromAdvisor.selectFiltered);
	entities$ = this.store.select(fromAdvisor.selectEntities);
	managers$ = this.store.select(fromAdvisor.selectManagers);
	managerEntities$ = this.store.select(fromAdvisor.selectManagersEntities);
	selectedAdvisor$ = this.store.select(fromAdvisor.selectedAdvisor);
	loading$ = this.store.select(fromAdvisor.selectLoading);
	search$ = this.store.select(fromAdvisor.selectSearch);
	total$ = this.store.select(fromAdvisor.selectTotal);

	constructor(private store: Store) {}

	loadAdvisors() {
		this.store.dispatch(AdvisorActions.loadAdvisors());
	}

	selectAdvisor(advisor: Advisor) {
		this.store.dispatch(AdvisorActions.selectAdvisor({ advisor }));
	}

	createAdvisor(advisor: Advisor) {
		this.store.dispatch(AdvisorActions.createAdvisor({ advisor }));
	}

	updateAdvisor(advisor: Advisor) {
		this.store.dispatch(AdvisorActions.updateAdvisor({ advisor }));
	}

	deleteAdvisor(uid: string) {
		this.store.dispatch(AdvisorActions.deleteAdvisor({ uid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(AdvisorActions.setSearchTerm({ searchTerm }));
	}
}
