import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
// Rxjs
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
// Store features
import * as fromTag from 'src/app/store/tag';
// Facades
import { TagFacade } from 'src/app/store/tag/tag.facade';

@Component({
	selector: 'app-tags-manage',
	standalone: true,
	templateUrl: './tags-manage.component.html',
	styleUrls: ['./tags-manage.component.scss'],
	imports: [
		CommonModule,
		IonicModule,
		FormsModule,
		ReactiveFormsModule
	],
})
export class TagsManageComponent {
	tag$ = this.tagFacade.selectedTag$;
	tag: fromTag.Tag;
	form: FormGroup = this.fb.group({
		uid: [''],
		name: ['', [Validators.required]],
	});

	constructor(
		private tagFacade: TagFacade,
		private fb: FormBuilder,
		private modalCtrl: ModalController,
		private alertCtrl: AlertController,
		private ref: ChangeDetectorRef,
	) { }

	async ngOnInit() {
		// Get last value of selected tag
		this.tag = await lastValueFrom(
			this.tagFacade.selectedTag$.pipe(take(1)),
		);

		if (this.tag) {
			this.form.patchValue({
				uid: this.tag.uid,
				name: this.tag.name,
			});
		} else {
			this.form.reset();
		}

		// Detect changes
		this.ref.detectChanges();
	}

	close() {
		this.modalCtrl.dismiss();
	}

	async create() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Crear rol`,
			message: `¿Desea crear el rol ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.tagFacade.createTag(form);
					// Exit
					this.close();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}

	async update() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Editar rol`,
			message: `¿Desea editar el rol ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {

					// Update tag
					this.tagFacade.updateTag(form);
					// Exit
					this.close();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}

	async remove() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Eliminar rol`,
			message: `¿Desea eliminar el rol ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					this.tagFacade.deleteTag(form.uid);
					// Exit
					this.close();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}
}