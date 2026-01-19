import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
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
		private navCtrl: NavController
	) { }

	ngOnInit() {
		this.inviteFacade.loadInvites();
	}

	filter(searchTerm: any) {
		// dispatch search term
		this.inviteFacade.searchText(searchTerm);
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

	isExpired(invite: Invite) {
		return Date.now() > invite.expiresAt;
	}
}
