import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AlertController } from '@ionic/angular';

import { CommissionPolicyFacade } from 'src/app/store/commission-policy/commission-policy.facade';
import { CommissionPolicy, CommissionSchemeCode } from 'src/app/store/commission-policy/commission-policy.model';

type ActiveFilter = 'all' | 'active' | 'inactive';

@Component({
	selector: 'app-commission-dynamics-list',
	standalone: false,
	templateUrl: './commission-dynamics-list.page.html',
	styleUrls: ['./commission-dynamics-list.page.scss'],
})
export class CommissionDynamicsListPage implements OnInit {
	private readonly router = inject(Router);
	private readonly facade = inject(CommissionPolicyFacade);
	private readonly alertCtrl = inject(AlertController);

	policies$ = this.facade.allCommissionPolicies$;
	loading$ = this.facade.loading$;

	activeFilter: ActiveFilter = 'all';
	schemeFilter: 'all' | CommissionSchemeCode = 'all';
	searchText = '';

	ngOnInit(): void {
		this.facade.loadCommissionPolicies();
	}

	getFiltered(list: CommissionPolicy[] | null | undefined): CommissionPolicy[] {
		if (!list?.length) return [];
		let out = [...list];
		const q = this.searchText.trim().toLowerCase();
		if (q) {
			out = out.filter((p) => (p.name ?? '').toLowerCase().includes(q));
		}
		if (this.activeFilter === 'active') {
			out = out.filter((p) => p.active !== false);
		} else if (this.activeFilter === 'inactive') {
			out = out.filter((p) => p.active === false);
		}
		if (this.schemeFilter !== 'all') {
			const s = this.schemeFilter;
			out = out.filter((p) => {
				const allowed = p.allowedSchemes?.length ? p.allowedSchemes : p.scheme ? [p.scheme] : [];
				return allowed.includes(s);
			});
		}
		return out.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'));
	}

	schemesLabel(p: CommissionPolicy): string {
		const allowed = p.allowedSchemes?.length ? p.allowedSchemes : p.scheme ? [p.scheme] : [];
		if (!allowed.length) return '—';
		return allowed.map((x) => `Esquema ${x}`).join(', ');
	}

	ruleCount(p: CommissionPolicy): number {
		return p.rules?.length ?? 0;
	}

	goNew(): void {
		void this.router.navigateByUrl('/dashboard/commission-dynamics/manage');
	}

	goEdit(uid: string): void {
		void this.router.navigate(['/dashboard/commission-dynamics/manage', uid]);
	}

	async confirmDeactivate(p: CommissionPolicy): Promise<void> {
		const alert = await this.alertCtrl.create({
			header: 'Desactivar dinámica',
			message: `¿Marcar "${p.name}" como inactiva? No se auto-asignará; seguirá disponible para asignación manual en tranche.`,
			buttons: [
				{ text: 'Cancelar', role: 'cancel' },
				{
					text: 'Desactivar',
					role: 'destructive',
					handler: () => {
						this.facade.updateCommissionPolicy({ ...p, active: false });
					},
				},
			],
		});
		await alert.present();
	}

	async confirmActivate(p: CommissionPolicy): Promise<void> {
		const alert = await this.alertCtrl.create({
			header: 'Activar dinámica',
			message: `¿Marcar "${p.name}" como activa? Podrá auto-asignarse a tranches según vigencia y reglas del motor.`,
			buttons: [
				{ text: 'Cancelar', role: 'cancel' },
				{
					text: 'Activar',
					handler: () => {
						this.facade.updateCommissionPolicy({ ...p, active: true });
					},
				},
			],
		});
		await alert.present();
	}
}
