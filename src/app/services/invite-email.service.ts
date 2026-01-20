import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { Invite } from 'src/app/store/invite/invite.model';
import { environment } from 'src/environments/environment';

@Injectable({
	providedIn: 'root',
})
export class InviteEmailService {

	private readonly serviceId = environment.emailJs.serviceId;
	private readonly templateId = environment.emailJs.inviteTemplateId;
	private readonly publicKey = environment.emailJs.publicKey;

	async sendInvite(invite: Invite, inviteLink: string): Promise<void> {
		await emailjs.send(
			this.serviceId,
			this.templateId,
			{
				to_email: invite.email,
				invite_link: inviteLink,
				role: invite.role === 1 ? 'Admin' : 'User',
			},
			this.publicKey
		);
	}
}
