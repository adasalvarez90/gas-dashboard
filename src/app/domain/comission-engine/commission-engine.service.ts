import { Injectable } from '@angular/core';
import { CommissionConfig } from 'src/app/store/commission-config/commission-config.model';
// Models
import { Contract } from 'src/app/store/contract/contract.model';
import { Deposit } from 'src/app/store/deposit/deposit.model';

@Injectable({
	providedIn: 'root',
})
export class CommissionEngineService {

	public calculateDashboard(
		contracts: Contract[],
		deposits: Deposit[],
		commissionConfigs: CommissionConfig[],
		from: number,
		to: number
	) {

	}
}
