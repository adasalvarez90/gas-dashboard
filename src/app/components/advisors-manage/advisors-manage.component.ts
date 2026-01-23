import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
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
		private toastCtrl: ToastController,
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

	create() {
		// Create new advisor
		this.advisorFacade.createAdvisor(this.form.value);
		// Exit
		this.close();
	}

	update() {
		// Update advisor
		this.advisorFacade.updateAdvisor(this.form.value);
		// Exit
		this.close();
	}

	remove() {
		// Delete advisor
		this.advisorFacade.deleteAdvisor(this.form.value.uid);
		// Exit
		this.close();
	}

}