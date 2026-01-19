import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
// Components
import { InviteDetailComponent } from 'src/app/components/invite-detail/invite-detail.component';
//
import { InviteFacade } from 'src/app/store/invite/invite.facade';
import { Invite } from 'src/app/store/invite/invite.model';

@Component({
	selector: 'app-invites',
	standalone: false,
	templateUrl: './invites.page.html',
	styleUrls: ['./invites.page.scss'],
})
export class InvitesPage implements OnInit {
	invites$ = this.inviteFacade.invites$;
	loading$ = this.inviteFacade.loading$;

	// Search term
	search$ = this.inviteFacade.search$;
	total$ = this.inviteFacade.total$;

	email = '';
	role: 1 | 2 = 2;

	constructor(
		private inviteFacade: InviteFacade,
		private navCtrl: NavController,
		private modalCtrl: ModalController
	) { }

	ngOnInit() {
		this.inviteFacade.loadInvites();
	}

	filter(searchTerm: any) {
		// dispatch search term
		this.inviteFacade.searchText(searchTerm);
	}

	async openInvite(invite: Invite) {
		const modal = await this.modalCtrl.create({
			component: InviteDetailComponent,
			componentProps: { invite },
		});

		await modal.present();
	}

	add() {
		// navigate to manage page
		this.navCtrl.navigateForward(['dashboard', 'invites', 'manage']);
	}

	resend(invite: Invite) {
		this.inviteFacade.resendInvite(invite);
	}

	cancel(invite: Invite) {
		this.inviteFacade.cancelInvite(invite.id);
	}

	copyLink(invite: Invite) {
		const url = `${window.location.origin}/register?token=${invite.token}`;
		navigator.clipboard.writeText(url);
	}

	isNearExpiration(invite: Invite, hours = 24): boolean {
		const now = Date.now();
		const threshold = hours * 60 * 60 * 1000;
		return (
			invite.status === 'pending' &&
			invite.expiresAt - now <= threshold &&
			invite.expiresAt > now
		);
	}


	isExpired(invite: Invite) {
		const expired = invite.status === "expired" || Date.now() > invite.expiresAt;
		if (invite.status !== "expired" && expired) this.inviteFacade.changeStatus(invite.id, "expired");

		return expired;
	}

	isDisable(invite: Invite) {
		// Return true when is cancelled | used | expired
		return invite.status === "cancelled" || invite.status === "used" || invite.status === "expired";
	}
}
