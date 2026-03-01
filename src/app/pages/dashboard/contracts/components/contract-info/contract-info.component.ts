import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Contract } from 'src/app/store/contract/contract.model';

@Component({
	selector: 'app-contract-info',
	standalone: true,
	templateUrl: './contract-info.component.html',
	styleUrls: ['./contract-info.component.scss'],
	imports: [
		CommonModule,
		IonicModule
	],
})
export class ContractInfoComponent {

	@Input() contract!: Contract;

}