import { Component, HostListener } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { ContractSeedModalComponent } from 'src/app/components/contract-seed-modal/contract-seed-modal.component';

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
		private contractFacade: ContractFacade,
		private navCtrl: NavController,
		private modalCtrl: ModalController,
	) { }

	async openSeedModal() {
		const modal = await this.modalCtrl.create({
			component: ContractSeedModalComponent,
		});
		await modal.present();
		await modal.onWillDismiss();
	}

	// Detect responsive changes
	@HostListener('window:resize', [])
	onResize() {
		this.isMobile = window.innerWidth < 992;
	}

	clearSelection() {
		this.contractFacade.selectContract(null as any);
	}

	addOrEdit(contract: any = null) {
		// set selected contract
		this.contractFacade.selectContract(contract);
		// navigate to manage page
		this.navCtrl.navigateForward(['dashboard', 'contracts', 'manage']);
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