import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { Contract, ContractStatus } from 'src/app/store/contract/contract.model';

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

	contracts$ = this.contractFacade.contractsByStatus$;
	selectedContract$ = this.contractFacade.selectedContract$;
	statusFilter$ = this.contractFacade.statusFilter$;
	statusCounts$ = this.contractFacade.statusCounts$;

	constructor(private contractFacade: ContractFacade) { }

	select(contract: Contract) {
		this.contractFacade.selectContract(contract);
	}

	setStatusFilter(statusFilter: ContractStatus) {
		this.contractFacade.setStatusFilter(statusFilter);
	}

	filter(search: string) {
		this.contractFacade.searchText(search);
	}
}