import { Invite } from '../store/invite/invite.model';
import { environment } from '../../environments/environment';

export function buildInviteLink(invite: Invite): string {
	// Return link
	return `${environment.appUrl}/invite/${invite.token}`;
}
