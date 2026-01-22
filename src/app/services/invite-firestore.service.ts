import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';

import { Invite } from 'src/app/store/invite/invite.model';

@Injectable({ providedIn: 'root' })
export class InviteFirestoreService {

	constructor(private firestore: Firestore) { }

	// ===== CREATE =====
	async createInvite(invite: Invite, ttlHours = 48): Promise<Invite> {
		const uid = uuidv4();
		const token = uuidv4();

		const now = Date.now();
		const expiresAt = now + ttlHours * 60 * 60 * 1000;

		const newInvite: Invite = {
			uid,
			email: invite.email,
			role: invite.role,
			token,
			status: 'pending',
			createdBy: invite.createdBy,
			createdAt: now,
			expiresAt,
			expiretedAt: null,
			resendCount: 0,
		};

		const ref = doc(this.firestore, `invites/${uid}`);
		await setDoc(ref, newInvite);

		return newInvite;
	}

	// ===== GET ALL =====
	async getInvites(): Promise<Invite[]> {
		const ref = collection(this.firestore, 'invites');
		const snap = await getDocs(ref);

		return snap.docs.map(d => {
			const data = d.data() as Invite;

			return {
				...data,
				uid: data.uid ?? d.id, // 🛡️ fallback seguro
			};
		});
	}


	// ===== GET BY TOKEN =====
	async getInviteByToken(token: string): Promise<Invite | null> {
		const ref = collection(this.firestore, 'invites');
		const q = query(ref, where('token', '==', token));
		const snap = await getDocs(q);

		if (snap.empty) return null;
		return snap.docs[0].data() as Invite;
	}

	// ===== RESEND =====
	async markResent(invite: Invite): Promise<void> {
		const ref = doc(this.firestore, `invites/${invite.uid}`);

		await updateDoc(ref, {
			resendCount: invite.resendCount + 1,
			lastSentAt: Date.now(),
		});
	}

	// ===== CANCEL =====
	async cancelInvite(inviteUid: string): Promise<void> {
		const ref = doc(this.firestore, `invites/${inviteUid}`);

		await updateDoc(ref, {
			status: 'cancelled',
			cancelledAt: Date.now(),
		});
	}

	// ===== CHANGE STATUS =====
	async changeStatus(inviteUid: string, status: string): Promise<void> {
		const ref = doc(this.firestore, `invites/${inviteUid}`);

		await updateDoc(ref, {
			status,
			cancelledAt: Date.now(),
		});
	}

	// ===== MARK AS USED =====
	async markAsUsed(inviteUid: string): Promise<void> {
		const ref = doc(this.firestore, `invites/${inviteUid}`);

		await updateDoc(ref, {
			status: 'used',
			usedAt: Date.now(),
		});
	}

	async updateInviteMetrics(inviteUid: string, changes: Partial<Invite>) {
		const ref = doc(this.firestore, 'invites', inviteUid);

		const snap = await getDoc(ref);
		console.log('🔥 DOC EXISTS?', snap.exists(), snap.id);

		if (!snap.exists()) {
			console.error('❌ DOCUMENT DOES NOT EXIST:', inviteUid);
			return;
		}

		await updateDoc(ref, changes);
	}

}
