import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
// Rxjs
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
// Store features
import * as fromAdvisor from 'src/app/store/advisor';
// Facades
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';

@Component({
	selector: 'app-advisors-manage',
	standalone: true,
	templateUrl: './advisors-manage.component.html',
	styleUrls: ['./advisors-manage.component.scss'],
	imports: [
		CommonModule,
		IonicModule,
		FormsModule,
		ReactiveFormsModule
	],
})
export class AdvisorsManageComponent {
	advisor$ = this.advisorFacade.selectedAdvisor$;
	managers$ = this.advisorFacade.managers$;
	advisor: fromAdvisor.Advisor;
	form: FormGroup = this.fb.group({
		uid: [''],
		name: ['', [Validators.required]],
		hierarchyLevel: ['', [Validators.required]],
		tags: [[], []],
		managerId: [null, []],
	});

	constructor(
		private advisorFacade: AdvisorFacade,
		private fb: FormBuilder,
		private modalCtrl: ModalController,
		private alertCtrl: AlertController,
		private ref: ChangeDetectorRef,
	) { }

	async ngOnInit() {
		// Get last value of selected advisor
		this.advisor = await lastValueFrom(
			this.advisorFacade.selectedAdvisor$.pipe(take(1)),
		);

		if (this.advisor) {
			this.form.patchValue({
				uid: this.advisor.uid,
				name: this.advisor.name,
				hierarchyLevel: this.advisor.hierarchyLevel,
				tags: this.advisor.tags,
				managerId: this.advisor.managerId,
			});
		} else {
			this.form.reset();
		}

		// Handle hierarchy level changes
		this.form.get('hierarchyLevel')?.valueChanges.subscribe(level => {
			// If not consultant, clear managerId
			if (level !== 'CONSULTANT') {
				// Clear validator
				this.form.get('managerId')?.clearValidators();
				this.form.get('managerId')?.updateValueAndValidity();
				// Clear managerId
				this.form.get('managerId')?.setValue(null);
			} else {
				// Set validator
				this.form.get('managerId')?.setValidators([Validators.required]);
				this.form.get('managerId')?.updateValueAndValidity();
			}
		});

		// Detect changes
		this.ref.detectChanges();
	}

	close() {
		this.modalCtrl.dismiss();
	}

	async create() {
		// Get the form value
		const form = this.form.value;
		// Create new user
		this.advisorFacade.createAdvisor(form);
		// Exit
		this.close();
	}

	async update() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Editar consultora`,
			message: `¿Desea editar la consultora ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Update advisor
					this.advisorFacade.updateAdvisor(form);
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
			header: `Eliminar consultora`,
			message: `¿Desea eliminar la consultora ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					this.advisorFacade.deleteAdvisor(form.uid);
					// Exit
					this.close();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}
}