import { Injectable } from '@angular/core';
import {
	Firestore,
	collection,
	doc,
	setDoc,
	getDoc,
	getDocs,
	updateDoc,
	query,
	where,
} from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';

import { Invite } from 'src/app/store/invite/invite.model';

@Injectable({ providedIn: 'root' })
export class InviteFirestoreService {
	private readonly collectionName = 'invites';

	constructor(private firestore: Firestore) { }

	// ===== CREATE =====
	async createInvite(
		email: string,
		role: 1 | 2,
		createdBy: string,
		ttlHours = 48,
	): Promise<Invite> {
		const id = uuidv4();
		const token = uuidv4();

		const now = Date.now();
		const expiresAt = now + ttlHours * 60 * 60 * 1000;

		const invite: Invite = {
			id,
			email,
			role,
			token,
			status: 'pending',
			createdBy,
			createdAt: now,
			expiresAt,
			resendCount: 0,
		};

		const ref = doc(this.firestore, this.collectionName, id);
		await setDoc(ref, invite);

		return invite;
	}

	// ===== GET ALL =====
	async getInvites(): Promise<Invite[]> {
		const ref = collection(this.firestore, this.collectionName);
		const snap = await getDocs(ref);

		return snap.docs.map(d => d.data() as Invite);
	}

	// ===== GET BY TOKEN =====
	async getInviteByToken(token: string): Promise<Invite | null> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('token', '==', token));
		const snap = await getDocs(q);

		if (snap.empty) return null;
		return snap.docs[0].data() as Invite;
	}

	// ===== RESEND =====
	async markResent(invite: Invite): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, invite.id);

		await updateDoc(ref, {
			resendCount: invite.resendCount + 1,
			lastSentAt: Date.now(),
		});
	}

	// ===== CANCEL =====
	async cancelInvite(inviteId: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, inviteId);

		await updateDoc(ref, {
			status: 'cancelled',
			cancelledAt: Date.now(),
		});
	}

	// ===== CHANGE STATUS =====
	async changeStatus(inviteId: string, status: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, inviteId);

		await updateDoc(ref, {
			status,
			cancelledAt: Date.now(),
		});
	}

	// ===== MARK AS USED =====
	async markAsUsed(inviteId: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, inviteId);

		await updateDoc(ref, {
			status: 'used',
			usedAt: Date.now(),
		});
	}

	updateInviteMetrics(inviteId: string, changes: Partial<Invite>) {
		const ref = doc(this.firestore, 'invites', inviteId);
		return updateDoc(ref, changes);
	}
}
