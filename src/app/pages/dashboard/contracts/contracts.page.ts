import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
// Components
import { ContractDetailComponent } from 'src/app/components/contract-detail/contract-detail.component';
//
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { Contract } from 'src/app/store/contract/contract.model';

@Component({
	selector: 'app-contracts',
	standalone: false,
	templateUrl: './contracts.page.html',
	styleUrls: ['./contracts.page.scss'],
})
export class ContractsPage implements OnInit {
	contracts$ = this.contractFacade.contracts$
	loading$ = this.contractFacade.loading$;

	advisorsDic$ = this.advisorFacade.entities$

	// Search term
	search$ = this.contractFacade.search$;
	total$ = this.contractFacade.total$;

	constructor(
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private navCtrl: NavController,
		private modalCtrl: ModalController
	) { }

	ngOnInit() {}

	filter(searchTerm: any) {
		// dispatch search term
		this.contractFacade.searchText(searchTerm);
	}

	async openContractDetail(contract: Contract) {
		const modal = await this.modalCtrl.create({
			component: ContractDetailComponent,
			componentProps: { contract },
		});

		await modal.present();
	}

	addOrEdit(contract: Contract = null) {
		// set selected contract
		this.contractFacade.selectContract(contract);
		// navigate to manage page
		this.navCtrl.navigateForward(['dashboard', 'contracts', 'manage']);
	}
}
