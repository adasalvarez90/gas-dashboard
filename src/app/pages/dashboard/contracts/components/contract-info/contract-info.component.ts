import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { Observable } from 'rxjs';

import { Contract } from 'src/app/store/contract/contract.model';

import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';

@Component({
	selector: 'app-contract-info',
	standalone: true,
	templateUrl: './contract-info.component.html',
	styleUrls: ['./contract-info.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class ContractInfoComponent implements OnInit {
	@Input() contract!: Contract;

	advisorsDic$ = this.advisorFacade.entities$;

	isSignContractModalOpen = false;
	signContractDate: string | null = null;
	get isSignContractValid(): boolean {
		return !!this.signContractDate;
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
	) {}

	ngOnInit() {
		this.advisorFacade.loadAdvisors();
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
		this.signContractDate = new Date().toISOString().slice(0, 10);
		this.isSignContractModalOpen = true;
	}

	closeSignContractModal() {
		this.isSignContractModalOpen = false;
		this.signContractDate = null;
	}

	confirmSignContract() {
		if (!this.contract) return;
		if (!this.isSignContractValid) return;
		const signatureDate = this.signContractDate ? new Date(this.signContractDate).getTime() : undefined;
		if (!signatureDate) return;
		this.contractFacade.updateContract({
			...this.contract,
			signed: true,
			signatureDate,
			initialCapital: this.contract.initialCapital ?? undefined,
		});
		this.closeSignContractModal();
	}
}
