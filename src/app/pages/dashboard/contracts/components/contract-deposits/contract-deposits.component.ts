import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { Observable } from 'rxjs';

import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { Deposit, SOURCE_ACCOUNT_NO_ESPECIFICADA, SourceAccountId } from 'src/app/store/deposit/deposit.model';

import { getSourceAccountOptions, SourceAccountOption } from 'src/app/domain/contract/contract-derived-fields.util';

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
	createDepositSourceAccount: SourceAccountId = 'funding';
	get isCreateDepositFormValid(): boolean {
		return typeof this.createDepositAmount === 'number' && isFinite(this.createDepositAmount) && this.createDepositAmount > 0;
	}

	isEditDepositModalOpen = false;
	editingDeposit: Deposit | null = null;
	editDepositAmount: number | null = null;
	editDepositDate: string | null = null;
	editDepositSourceAccount: SourceAccountId = 'funding';
	get isEditDepositFormValid(): boolean {
		return typeof this.editDepositAmount === 'number' && isFinite(this.editDepositAmount) && this.editDepositAmount > 0;
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
		this.createDepositSourceAccount = 'funding';
		this.isCreateDepositModalOpen = true;
	}

	closeCreateDepositModal() {
		this.isCreateDepositModalOpen = false;
		this.depositTargetTranche = null;
		this.createDepositAmount = null;
		this.createDepositDate = null;
	}

	getSourceAccountOptions(contract: Contract): SourceAccountOption[] {
		return getSourceAccountOptions(contract);
	}

	isDepositInvalid(deposit: Deposit): boolean {
		return deposit.sourceAccount === SOURCE_ACCOUNT_NO_ESPECIFICADA ||
			deposit.sourceAccount === undefined;
	}

	getDepositSourceInstitution(deposit: Deposit): string {
		if (!this.contract || this.isDepositInvalid(deposit)) return 'No especificada';
		switch (deposit.sourceAccount) {
			case 'funding':
				return this.contract.fundingBankInstitution || '—';
			case 'returns':
				return this.contract.returnsBankInstitution || '—';
			default:
				return '—';
		}
	}

	getDepositSourceAccount(deposit: Deposit): string {
		if (!this.contract || this.isDepositInvalid(deposit)) return '—';
		switch (deposit.sourceAccount) {
			case 'funding':
				return this.contract.fundingAccount || '—';
			case 'returns':
				return this.contract.returnsAccount || this.contract.fundingAccount || '—';
			default:
				return '—';
		}
	}

	getDepositSourceSummary(deposit: Deposit): string {
		if (!this.contract || this.isDepositInvalid(deposit)) return 'No especificada';
		const inst = this.getDepositSourceInstitution(deposit);
		const acct = this.getDepositSourceAccount(deposit);
		return `${inst} - ${acct}`;
	}

	openEditDepositModal(deposit: Deposit, event: Event) {
		event.stopPropagation();
		this.editingDeposit = deposit;
		this.editDepositAmount = deposit.amount;
		this.editDepositDate = deposit.depositedAt ? new Date(deposit.depositedAt).toISOString().slice(0, 10) : null;
		this.editDepositSourceAccount = deposit.sourceAccount ?? SOURCE_ACCOUNT_NO_ESPECIFICADA;
		this.isEditDepositModalOpen = true;
	}

	closeEditDepositModal() {
		this.isEditDepositModalOpen = false;
		this.editingDeposit = null;
		this.editDepositAmount = null;
		this.editDepositDate = null;
	}

	confirmEditDeposit() {
		if (!this.editingDeposit || !this.isEditDepositFormValid) return;
		const depositedAt = this.editDepositDate ? new Date(this.editDepositDate).getTime() : this.editingDeposit.depositedAt;
		const updated: Deposit = {
			...this.editingDeposit,
			amount: this.editDepositAmount!,
			depositedAt,
			sourceAccount: this.editDepositSourceAccount,
		};
		this.depositFacade.updateDeposit(updated);
		this.closeEditDepositModal();
	}

	confirmDeleteDeposit(deposit: Deposit, event: Event) {
		event.stopPropagation();
		if (confirm(`¿Eliminar el depósito de $${deposit.amount?.toLocaleString()}?`)) {
			this.depositFacade.deleteDeposit(deposit.uid);
		}
	}

	confirmCreateDeposit() {
		if (!this.contract?.uid) return;
		if (!this.depositTargetTranche?.uid) return;
		if (!this.isCreateDepositFormValid) return;
		const depositedAt = this.createDepositDate ? new Date(this.createDepositDate).getTime() : Date.now();
		this.selectTranche(this.depositTargetTranche.uid);
		const newDeposit: Deposit = {
			contractUid: this.contract.uid,
			trancheUid: this.depositTargetTranche.uid,
			amount: this.createDepositAmount!,
			depositedAt,
			sourceAccount: this.createDepositSourceAccount,
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
