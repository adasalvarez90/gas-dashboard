import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { Contract } from 'src/app/store/contract/contract.model';

@Component({
	selector: 'app-contracts-list',
	standalone: true,
	templateUrl: './contracts-list.component.html',
	styleUrls: ['./contracts-list.component.scss'],
	imports: [
		CommonModule,
		IonicModule
	],
})
export class ContractsListComponent {

	contracts$ = this.contractFacade.contracts$;
	selectedContract$ = this.contractFacade.selectedContract$;

	currentFilter: 'pending' | 'signed' = 'pending';

	constructor(private contractFacade: ContractFacade) { }

	select(contract: Contract) {
		this.contractFacade.selectContract(contract);
	}

	setFilter(filter: 'pending' | 'signed') {
		this.currentFilter = filter;
	}

	filter(search: string) {
		this.contractFacade.searchText(search);
	}
}