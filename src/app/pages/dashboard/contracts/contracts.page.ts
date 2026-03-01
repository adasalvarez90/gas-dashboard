import { Component, HostListener } from '@angular/core';
import { ContractFacade } from 'src/app/store/contract/contract.facade';

@Component({
	selector: 'app-contracts',
	standalone: false,
	templateUrl: './contracts.page.html',
	styleUrls: ['./contracts.page.scss'],
})
export class ContractsPage {

	contracts$ = this.contractFacade.contracts$;
	selectedContract$ = this.contractFacade.selectedContract$;

	isMobile = window.innerWidth < 992;

	currentFilter: 'pending' | 'signed' = 'pending';

	activeTab: 'info' | 'deposits' | 'commissions' = 'info';

	constructor(
		private contractFacade: ContractFacade
	) { }

	// Detect responsive changes
	@HostListener('window:resize', [])
	onResize() {
		this.isMobile = window.innerWidth < 992;
	}

	clearSelection() {
		this.contractFacade.selectContract(null as any);
	}

	addOrEdit(contract: any = null) {
		this.contractFacade.selectContract(contract);
	}

	select(contract: any) {
		this.contractFacade.selectContract(contract);
	}

	setFilter(filter: 'pending' | 'signed') {
		this.currentFilter = filter;
	}

	filter(search: string) {
		this.contractFacade.searchText(search);
	}
}