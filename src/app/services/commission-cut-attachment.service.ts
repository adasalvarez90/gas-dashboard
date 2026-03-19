import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';

export type AttachmentType = 'invoice' | 'receipt';

@Injectable({ providedIn: 'root' })
export class CommissionCutAttachmentService {
	private readonly basePath = 'commission-cuts';

	constructor(private storage: Storage) {}

	async uploadAttachment(
		cutDate: number,
		advisorUid: string,
		type: AttachmentType,
		file: File
	): Promise<string> {
		const ext = file.name.split('.').pop() || 'pdf';
		const path = `${this.basePath}/${cutDate}/${advisorUid}/${type}-${uuidv4()}.${ext}`;
		const storageRef = ref(this.storage, path);
		await uploadBytes(storageRef, file);
		return getDownloadURL(storageRef);
	}
}
