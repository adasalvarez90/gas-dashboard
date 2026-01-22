import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

import { Invite } from 'src/app/store/invite/invite.model';

@Component({
	selector: 'app-invite-detail',
	standalone: true,
	templateUrl: './invite-detail.component.html',
	styleUrls: ['./invite-detail.component.scss'],
	imports: [
		CommonModule,
		IonicModule
	],
})
export class InviteDetailComponent {
	@Input() invite!: Invite;

	inviteLink = '';

	constructor(
		private modalCtrl: ModalController,
		private toastCtrl: ToastController,
	) { }

	ngOnInit() {
		this.inviteLink =
			`${window.location.origin}/register?token=${this.invite.token}`;
	}

	close() {
		this.modalCtrl.dismiss();
	}

	async copyLink() {
		// Create the toast
		const toast = await this.toastCtrl.create({
			color: 'medium',
			message: 'Se copió en el porta papeles',
			duration: 3000,
			position: 'bottom',
			cssClass: 'toast-auth',
		});

		navigator.clipboard.writeText(this.inviteLink);

		// Show the toast
		await toast.present();
	}

	resend() {
		// facade.resendInvite(this.invite)
	}

	cancel() {
		// facade.cancelInvite(this.invite.uid)
	}

	isNearExpiration(invite: Invite): boolean {
		return (
			invite.status === 'pending' &&
			invite.expiresAt - Date.now() <= 24 * 60 * 60 * 1000 &&
			invite.expiresAt > Date.now()
		);
	}
}