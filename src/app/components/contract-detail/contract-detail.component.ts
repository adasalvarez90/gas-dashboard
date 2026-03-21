import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, NavController, ToastController } from '@ionic/angular';

// Models
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { Contract, ContractStatus } from '../../store/contract/contract.model';
import { toCanonicalMexicoDateTimestamp, toMexicoDateInputValue } from 'src/app/domain/time/mexico-time.util';

@Component({
	selector: 'app-contract-detail',
	standalone: true,
	templateUrl: './contract-detail.component.html',
	styleUrls: ['./contract-detail.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class ContractDetailComponent {

	contract$ = this.contractFacade.selectedContract$;

	advisorsDic$ = this.advisorFacade.entities$;

	private contractPendingSign: Contract | null = null;
	isSignContractModalOpen = false;
	signContractDate: string | null = null;
	signInitialCapital = '';

	get isSignContractValid(): boolean {
		if (!this.signContractDate) return false;
		const cap = Number(String(this.signInitialCapital).replace(',', '.'));
		return Number.isFinite(cap) && cap >= 1;
	}

	constructor(
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private navCtrl: NavController,
		private modalCtrl: ModalController,
		private toastCtrl: ToastController,
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

	contractStatusLabel(s: ContractStatus): string {
		const m: Record<ContractStatus, string> = {
			PENDING: 'Pendiente',
			ACTIVE: 'Activo',
			FINISHED: 'Finalizado',
			CANCELLED: 'Cancelado',
		};
		return m[s] ?? s;
	}

	async onSignToolbarClick(contract: Contract) {
		if (contract.signed) {
			const t = await this.toastCtrl.create({
				message: 'Para cambiar firma o capital inicial usa Editar.',
				duration: 2800,
				position: 'middle',
				color: 'medium',
			});
			await t.present();
			return;
		}
		this.contractPendingSign = contract;
		this.signContractDate = toMexicoDateInputValue(Date.now());
		const existing = contract.initialCapital;
		this.signInitialCapital =
			existing != null && Number.isFinite(existing) && existing >= 1 ? String(existing) : '';
		this.isSignContractModalOpen = true;
	}

	closeSignContractModal() {
		this.isSignContractModalOpen = false;
		this.signContractDate = null;
		this.signInitialCapital = '';
		this.contractPendingSign = null;
	}

	confirmSignContract() {
		const contract = this.contractPendingSign;
		if (!contract || !this.isSignContractValid) return;
		const signatureDate = toCanonicalMexicoDateTimestamp(this.signContractDate);
		if (!signatureDate) return;
		const initialCapital = Number(String(this.signInitialCapital).replace(',', '.'));
		this.contractFacade.updateContract({
			...contract,
			signed: true,
			signatureDate,
			initialCapital,
		});
		this.closeSignContractModal();
	}

}
