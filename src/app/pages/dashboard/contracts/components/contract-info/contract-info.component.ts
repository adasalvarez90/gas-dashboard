import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { Observable } from 'rxjs';

import { Contract } from 'src/app/store/contract/contract.model';

import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { AdvisorFirestoreService } from 'src/app/services/advisor-firestore.service';
import { toCanonicalMexicoDateTimestamp, toMexicoDateInputValue } from 'src/app/domain/time/mexico-time.util';

@Component({
	selector: 'app-contract-info',
	standalone: true,
	templateUrl: './contract-info.component.html',
	styleUrls: ['./contract-info.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class ContractInfoComponent implements OnChanges {
	@Input() contract!: Contract;

	advisorsDic$ = this.advisorFacade.entities$;

	isSignContractModalOpen = false;
	signContractDate: string | null = null;

	/** Firma: fecha válida y el contrato ya debe traer capital inicial (capturado en Editar / alta). */
	get isSignContractValid(): boolean {
		if (!this.signContractDate) return false;
		const cap = this.contract?.initialCapital;
		return cap != null && Number.isFinite(Number(cap)) && Number(cap) >= 1;
	}

	readonly CONTRACT_STATUS_LABELS: Record<string, string> = {
		PENDING: 'Pendiente',
		ACTIVE: 'Activo',
		FINISHED: 'Finalizado',
		CANCELLED: 'Cancelado',
	};

	constructor(
		private contractFacade: ContractFacade,
		private advisorFacade: AdvisorFacade,
		private advisorFS: AdvisorFirestoreService,
	) {}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['contract'] && this.contract) {
			void this.loadAdvisorsWithArchivedForContract();
		}
	}

	private async loadAdvisorsWithArchivedForContract(): Promise<void> {
		const merged = await this.advisorFS.mergeActiveWithArchivedForContractRoles(this.contract?.roles);
		this.advisorFacade.replaceAdvisorsInStore(merged);
	}

	contractStatusLabel(status: string): string {
		if (!status) return '';
		return this.CONTRACT_STATUS_LABELS[status] ?? status;
	}

	getAdvisorName(advisorsDic: Record<string, { name?: string }> | null, uid: string | undefined): string {
		if (!uid) return '—';
		const name = advisorsDic?.[uid]?.name;
		return name ?? uid;
	}

	openSignContractModal() {
		this.signContractDate = toMexicoDateInputValue(Date.now());
		this.isSignContractModalOpen = true;
	}

	closeSignContractModal() {
		this.isSignContractModalOpen = false;
		this.signContractDate = null;
	}

	confirmSignContract() {
		if (!this.contract) return;
		if (!this.isSignContractValid) return;
		const signatureDate = toCanonicalMexicoDateTimestamp(this.signContractDate);
		if (!signatureDate) return;
		const initialCapital = Number(this.contract.initialCapital);
		this.contractFacade.updateContract({
			...this.contract,
			signed: true,
			signatureDate,
			initialCapital,
		});
		this.closeSignContractModal();
	}
}
