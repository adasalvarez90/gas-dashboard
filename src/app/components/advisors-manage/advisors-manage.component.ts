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
	advisor: fromAdvisor.Advisor;
	form: FormGroup = this.fb.group({
		uid: [''],
		name: ['', [Validators.required]]
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
			header: `Crear consultora`,
			message: `¿Desea crear la consultora ${form.name}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.advisorFacade.createAdvisor(form);
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