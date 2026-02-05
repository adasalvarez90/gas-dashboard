import { Component, OnInit } from '@angular/core';
import { map, take, tap } from 'rxjs/operators';
// Facades
import { CommissionFacade } from 'src/app/store/commission/commission.facade';

@Component({
	selector: 'app-commissions',
	standalone: false,
	templateUrl: './commissions.page.html',
	styleUrls: ['./commissions.page.scss'],
})
export class CommissionsPage implements OnInit {
	commissions$ = this.commissionFacade.commissions$;

	sourcesOrder = [
		{ key: 'COMMUNITY', label: 'Comunidad' },
		{ key: 'WARM_NETWORK', label: 'Red Calida' },
		{ key: 'SELF_FUNDED', label: 'Autofinanciado' },
		{ key: 'REFERRER', label: 'Referente' }
	];

	rolesOrder = [
		{ key: 'KAM', label: 'KAM' },
		{ key: 'CONSULTANT', label: 'Consultora' },
		{ key: 'MANAGER', label: 'Gerente' },
		{ key: 'SM', label: 'Dirección de ventas' },
		{ key: 'OS', label: 'Equipo operativo' },
		{ key: 'CEO', label: 'CEO' },
		{ key: 'REFERRAL', label: 'Referidora' }
	];

	matrix$ = this.commissions$.pipe(
		map(commissions => {
			const matrix: Record<string, Record<string, number>> = {};

			commissions.forEach(c => {
				if (!matrix[c.role]) matrix[c.role] = {};
				matrix[c.role][c.source] = c.percentage;
			});

			this.matrixLocal = JSON.parse(JSON.stringify(matrix));
			this.originalMatrix = JSON.parse(JSON.stringify(matrix));

			return matrix;
		})
	);

	matrixLocal: any = {};
	originalMatrix: any = {};

	constructor(private commissionFacade: CommissionFacade) { }

	ngOnInit() { }

	get hasUnsavedChanges(): boolean {
		if (!this.matrixLocal || !this.originalMatrix) return false;

		for (const role of Object.keys(this.matrixLocal)) {
			for (const source of Object.keys(this.matrixLocal[role])) {
				if (this.matrixLocal[role][source] !== this.originalMatrix[role]?.[source]) {
					return true;
				}
			}
		}
		return false;
	}

	updateValue(role: string, source: string, value: number) {
		const num = Number(value);

		if (num >= 0 && num <= 100) {

			if (!this.matrixLocal[role]) {
				this.matrixLocal[role] = {};
				if (!this.matrixLocal[role][source]) {
					this.matrixLocal[role][source] = -1;
				}
			}


			this.matrixLocal[role][source] = num;
		}
	}

	isModified(role: string, source: string): boolean {

		return this.matrixLocal?.[role]?.[source] !== this.originalMatrix?.[role]?.[source];
	}

	saveMatrix() {
		const ops = [];

		for (const role of Object.keys(this.matrixLocal)) {
			for (const source of Object.keys(this.matrixLocal[role])) {

				if (!this.originalMatrix[role]) {
					this.originalMatrix[role] = {};
					if (!this.originalMatrix[role][source]) {
						this.originalMatrix[role][source] = -1;
					}
				}

				const percentage = this.matrixLocal[role][source];
				const original = this.originalMatrix[role][source];

				if (percentage !== original) {
					ops.push({ role, source, percentage });
				}
			}
		}

		this.commissionFacade.upsertManyCommissions(ops);
	}

	calculateTotalForSource(source: string): number {
		let total = 0;
		for (const role of Object.keys(this.matrixLocal)) {
			const value = this.matrixLocal[role][source];
			if (typeof value === 'number' && !isNaN(value)) {
				total += value;
			}
		}
		return total;
	}
}
