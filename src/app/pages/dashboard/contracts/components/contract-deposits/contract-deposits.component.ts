import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { Observable } from 'rxjs';

import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { Deposit } from 'src/app/store/deposit/deposit.model';

import { DepositFacade } from 'src/app/store/deposit/deposit.facade';
import { TrancheFacade } from 'src/app/store/tranche/tranche.facade';

@Component({
	selector: 'app-contract-deposits',
	standalone: true,
	templateUrl: './contract-deposits.component.html',
	styleUrls: ['./contract-deposits.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class ContractDepositsComponent implements OnInit, OnChanges {
	@Input() contract!: Contract;

	tranches$: Observable<Tranche[]> = this.trancheFacade.tranches$;
	deposits$: Observable<Deposit[]> = this.depositFacade.deposits$;

	selectedTrancheUid: string | null = null;

	isCreateTrancheModalOpen = false;
	createTrancheAmount: number | null = null;
	createTrancheDate: string | null = null;
	get isCreateTrancheAmountValid(): boolean {
		return typeof this.createTrancheAmount === 'number' && isFinite(this.createTrancheAmount) && this.createTrancheAmount > 0;
	}

	isCreateDepositModalOpen = false;
	depositTargetTranche: Tranche | null = null;
	createDepositAmount: number | null = null;
	createDepositDate: string | null = null;
	get isCreateDepositAmountValid(): boolean {
		return typeof this.createDepositAmount === 'number' && isFinite(this.createDepositAmount) && this.createDepositAmount > 0;
	}

	constructor(
		private depositFacade: DepositFacade,
		private trancheFacade: TrancheFacade,
	) {}

	ngOnInit() {
		this.trancheFacade.loadTranches(this.contract?.uid || '');
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['contract'] && this.contract?.uid) {
			this.trancheFacade.loadTranches(this.contract.uid);
		}
	}

	loadData(trancheUid: string) {
		this.depositFacade.loadDeposits(trancheUid);
	}

	selectTranche(trancheUid: string | null) {
		if (trancheUid === null) {
			this.selectedTrancheUid = null;
			return;
		}
		if (this.selectedTrancheUid === trancheUid) {
			this.selectedTrancheUid = null;
			return;
		}
		this.selectedTrancheUid = trancheUid;
		this.loadData(trancheUid);
	}

	openCreateTrancheModal() {
		this.createTrancheAmount = null;
		this.createTrancheDate = null;
		this.isCreateTrancheModalOpen = true;
	}

	closeCreateTrancheModal() {
		this.isCreateTrancheModalOpen = false;
	}

	confirmCreateTranche() {
		if (!this.contract?.uid) return;
		if (!this.isCreateTrancheAmountValid) return;
		const dateMs = this.createTrancheDate ? new Date(this.createTrancheDate).getTime() : undefined;
		this.trancheFacade.createTranche(this.contract.uid, this.createTrancheAmount!, dateMs, dateMs);
		this.closeCreateTrancheModal();
	}

	openCreateDepositModal(tranche: Tranche) {
		this.depositTargetTranche = tranche;
		this.createDepositAmount = null;
		this.createDepositDate = null;
		this.isCreateDepositModalOpen = true;
	}

	closeCreateDepositModal() {
		this.isCreateDepositModalOpen = false;
		this.depositTargetTranche = null;
		this.createDepositAmount = null;
		this.createDepositDate = null;
	}

	confirmCreateDeposit() {
		if (!this.contract?.uid) return;
		if (!this.depositTargetTranche?.uid) return;
		if (!this.isCreateDepositAmountValid) return;
		const depositedAt = this.createDepositDate ? new Date(this.createDepositDate).getTime() : Date.now();
		this.selectTranche(this.depositTargetTranche.uid);
		const newDeposit: Deposit = {
			contractUid: this.contract.uid,
			trancheUid: this.depositTargetTranche.uid,
			amount: this.createDepositAmount!,
			depositedAt,
			uid: '',
		};
		this.depositFacade.createDeposit(newDeposit);
		this.closeCreateDepositModal();
	}

	/** Fecha de registro o creación del tranche para mostrar en la UI. */
	getTrancheDisplayDate(tranche: Tranche): number | null {
		return tranche.registeredAt ?? (tranche as unknown as { _create?: number })._create ?? null;
	}
}
