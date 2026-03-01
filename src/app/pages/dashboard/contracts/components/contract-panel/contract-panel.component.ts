import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Contract } from 'src/app/store/contract/contract.model';

@Component({
	selector: 'app-contract-panel',
	standalone: true,
	templateUrl: './contract-panel.component.html',
	styleUrls: ['./contract-panel.component.scss'],
	imports: [
		CommonModule,
		IonicModule
	],
})
export class ContractPanelComponent {

	@Input() contract: Contract | null = null;
	@Output() back = new EventEmitter<void>();

	activeTab: 'info' | 'deposits' | 'commissions' = 'info';

	isMobile = window.innerWidth < 992;

	goBack() {
		this.back.emit();
	}
}