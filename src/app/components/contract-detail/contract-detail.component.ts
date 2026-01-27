import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavController } from '@ionic/angular';
import * as _ from 'lodash';

// Models
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { Contract } from '../../store/contract/contract.model';

@Component({
	selector: 'app-contract-detail',
	standalone: true,
	templateUrl: './contract-detail.component.html',
	styleUrls: ['./contract-detail.component.scss'],
	imports: [
		CommonModule,
		IonicModule
	],
})
export class ContractDetailComponent {

	contract$ = this.contractFacade.selectedContract$;

	advisorsDic$ = this.advisorFacade.entities$

	constructor(
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private navCtrl: NavController,
		private modalCtrl: ModalController
	) { }

	close(): void {
		this.modalCtrl.dismiss();
	}

	edit() {
		// Close modal
		this.close();
		// navigate to manage page
		this.navCtrl.navigateForward(['dashboard', 'contracts', 'manage']);
	}

	toggleSign(contract: Contract) {
		// Create clone
		let updated = _.cloneDeep(contract);

		// Update signed
		updated.signed = !contract.signed;

		// Update contract
		this.contractFacade.updateContract(updated);
	}

}
