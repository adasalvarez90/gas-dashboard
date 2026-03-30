import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
// Facades
import { AuthFacade } from 'src/app/store/auth/auth.facade';
import { UserFacade } from 'src/app/store/user/user.facade';
import { DevTestDataWipeService } from 'src/app/services/dev-test-data-wipe.service';

@Component({
	selector: 'app-dashboard',
	standalone: false,
	templateUrl: './dashboard.page.html',
	styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
	public menu = [
		{
			name: 'Home',
			role: 2,
			pages: [
				{ name: 'Métricas', url: '/dashboard/metrics', icon: 'analytics', role: 2, hidden: false, badge: '' },
				{ name: 'Usuarios', url: '/dashboard/users', icon: 'people', role: 2, hidden: false, badge: '' },
			],
		},
		{
			name: 'Admin',
			role: 1,
			pages: [
				{ name: 'Equipo Futuro es Femenino', url: '/dashboard/advisors', icon: 'female', role: 1, hidden: false, badge: '' },
				{ name: 'Esquema de comisiones', url: '/dashboard/commission-configs', icon: 'cash', role: 1, hidden: false, badge: '' },
				{ name: 'Cortes de comisión', url: '/dashboard/commission-cuts', icon: 'cut', role: 1, hidden: false, badge: '' },
				{ name: 'Contratos', url: '/dashboard/contracts', icon: 'briefcase', role: 1, hidden: false, badge: '' },
				{ name: 'Invitaciones', url: '/dashboard/invites', icon: 'people', role: 1, hidden: true, badge: '' },
			]
		}
	];

	user$ = this.userFacade.selectedUser$;

	auth$ = this.authFacade.user$;
	constructor(
		private authFacade: AuthFacade,
		private userFacade: UserFacade,
		private alertCtrl: AlertController,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
		private devTestDataWipe: DevTestDataWipeService,
	) { }

	ngOnInit() { }

	public editProfile(user: any) {
		// set selected user
		this.userFacade.selectUser(user);
	}

	logout() {
		// Confirm logout action
		this.alertCtrl
			.create({
				header: 'Cerrar sesión',
				message: '¿Estás seguro de que deseas cerrar sesión?',
				buttons: [
					{
						text: 'Cancelar',
						role: 'cancel',
					},
					{
						text: 'Cerrar sesión',
						role: 'confirm',
						handler: () => {
							this.authFacade.logout();
						},
					},
				],
			})
			.then((alert) => alert.present());
	}

	confirmWipeTestData() {
		this.alertCtrl
			.create({
				header: 'Borrar datos',
				message:
					'Se eliminarán permanentemente todos los documentos en Firestore de: contratos, depósitos, tranches, pagos de comisión y estados de corte por asesor (commissionCutAdvisorStates). Esta acción no se puede deshacer. ¿Continuar?',
				buttons: [
					{ text: 'Cancelar', role: 'cancel' },
					{
						text: 'Borrar',
						role: 'destructive',
						handler: () => {
							void this.runWipeTestData();
						},
					},
				],
			})
			.then((a) => a.present());
	}

	private async runWipeTestData() {
		const loading = await this.loadingCtrl.create({
			message: 'Borrando datos…',
			spinner: 'crescent',
		});
		await loading.present();
		try {
			const summary =
				await this.devTestDataWipe.wipeContractsDepositsTranchesCommissionPayments();
			const detail = summary.map((s) => `${s.name} ${s.deleted}`).join(' · ');
			const toast = await this.toastCtrl.create({
				message: `Listo. Documentos borrados: ${detail}. Recarga si aún ves datos viejos.`,
				duration: 6000,
				position: 'bottom',
				color: 'success',
			});
			await toast.present();
		} catch (e) {
			const msg =
				e instanceof Error ? e.message : 'No se pudieron borrar los datos.';
			const toast = await this.toastCtrl.create({
				message: msg,
				duration: 5000,
				position: 'bottom',
				color: 'danger',
			});
			await toast.present();
		} finally {
			await loading.dismiss();
		}
	}
}
