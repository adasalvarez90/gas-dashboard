import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Contract } from 'src/app/store/contract/contract.model';
import { ContractInfoComponent } from '../contract-info/contract-info.component';
import { ContractDepositsComponent } from '../contract-deposits/contract-deposits.component';
import { ContractCommissionsComponent } from '../contract-commissions/contract-commissions.component';

@Component({
	selector: 'app-contract-panel',
	standalone: true,
	templateUrl: './contract-panel.component.html',
	styleUrls: ['./contract-panel.component.scss'],
	imports: [
		CommonModule,
		IonicModule,
		ContractInfoComponent,
		ContractDepositsComponent,
		ContractCommissionsComponent,
	],
})
export class ContractPanelComponent implements OnChanges {

	@Input() contract: Contract | null = null;
	@Output() back = new EventEmitter<void>();
	@Output() editRequested = new EventEmitter<Contract>();

	activeTab: 'info' | 'deposits' | 'commissions' = 'info';

	isMobile = window.innerWidth < 992;

	ngOnChanges(changes: SimpleChanges) {
		const c = changes['contract'];
		if (c?.currentValue && !c.currentValue.signed && (this.activeTab === 'deposits' || this.activeTab === 'commissions')) {
			this.activeTab = 'info';
		}
	}

	goBack() {
		this.back.emit();
	}

	editContract() {
		if (this.contract) this.editRequested.emit(this.contract);
	}
}