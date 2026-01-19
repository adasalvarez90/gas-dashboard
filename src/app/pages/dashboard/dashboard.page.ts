import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
// Facades
import { AuthFacade } from 'src/app/store/auth/auth.facade';
import { UserFacade } from 'src/app/store/user/user.facade';

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
				{ name: 'Usuarios', url: '/dashboard/users', icon: 'people', role: 2, hidden: false, badge: '' },
			],
		},
		{
			name: 'Admin',
			role: 1,
			pages: [
				{ name: 'Invitaciones', url: '/dashboard/invites', icon: 'people', role: 1, hidden: false, badge: '' },
			]
		}
	];

	user$ = this.userFacade.selectedUser$;

	auth$ = this.authFacade.user$;
	constructor(
		private authFacade: AuthFacade,
		private userFacade: UserFacade,
		private alertCtrl: AlertController,
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
}
