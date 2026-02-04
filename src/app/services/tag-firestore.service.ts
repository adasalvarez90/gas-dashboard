import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';
import * as _ from 'lodash';

import { Tag } from 'src/app/store/tag/tag.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ 
	providedIn: 'root'
})
export class TagFirestoreService {

	private readonly collectionName = 'tags';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getTags(): Promise<Tag[]> {
		const ref = collection(this.firestore, this.collectionName);

		const q = query(ref, where('_on', '==', true));
		
		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as Tag);
	}

	// ➕ Create tag
	async createTag(tag: Tag): Promise<Tag> {
		const uid = uuidv4();

		const newTag: Tag = {
			uid,
			name: tag.name,
			_create: Date.now(),
			_on: true,
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newTag);

		return newTag;
	}

	// ✏️ Update tag
	async updateTag(tag: Tag): Promise<void> {
		let updateTag = _.cloneDeep(tag);

		updateTag._update = Date.now();
		
		const ref = doc(this.firestore, this.collectionName, tag.uid);
		
		await updateDoc(ref, { ...updateTag, });
	}

	// 🗑️ Delete tag
	async deleteTag(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
