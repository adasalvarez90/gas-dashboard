import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

// RxJS
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

// Store
import * as fromContract from 'src/app/store/contract';
import { ContractFacade } from 'src/app/store/contract/contract.facade';

import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';

@Component({
	selector: 'app-manage-contract',
	standalone: false,
	templateUrl: './manage.page.html',
	styleUrls: ['./manage.page.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagePage implements OnInit {
	advisors$ = this.advisorFacade.advisors$;
	contract$ = this.contractFacade.selectedContract$;
	contract: fromContract.Contract | null;

	form: FormGroup = this.fb.group({
		uid: [''],

		advisorUid: ['', Validators.required],
		investor: ['', Validators.required],
		email: ['', [Validators.required, Validators.email]],

		capitalMXN: [null, Validators.required],
		yieldPercent: [null, Validators.required],
		liquidity: [null, Validators.required],
		term: [null, Validators.required],

		yieldFrequency: ['', Validators.required],
		payments: ['', Validators.required],

		accountStatus: ['', Validators.required],
		scheme: ['', Validators.required],

		signature: [''],
		deposit: [''],
		depositAccount: [''],
		clientAccount: [''],

		docs: [false],
		docsComments: [''],

		beneficiaries: [''],
		signed: [false],
	});

	constructor(
		private contractFacade: ContractFacade,
		private advisorFacade: AdvisorFacade,
		private navCtrl: NavController,
		private fb: FormBuilder,
		private alertCtrl: AlertController,
		private ref: ChangeDetectorRef,
	) { }

	async ngOnInit() {

		this.contract = await lastValueFrom(
			this.contractFacade.selectedContract$.pipe(take(1)),
		);

		if (this.contract) {
			this.form.patchValue(this.contract);
		} else {
			this.form.reset();
		}

		this.ref.detectChanges();
	}

	async create() {
		// Get the form value
		const form = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Crear contrato`,
			message: `¿Desea crear el contrato para ${form.investor}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.contractFacade.createContract(form);
					// Exit
					this.exit();
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
			header: `Editar contrato`,
			message: `¿Desea editar el contrato para ${form.investor}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.contractFacade.updateContract(form);
					// Exit
					this.exit();
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
			header: `Eliminar contrato`,
			message: `¿Desea eliminar el contrato para ${form.investor}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.contractFacade.deleteContract(form.uid);
					// Exit
					this.exit();
				}
			}]
		});
		// Present the prompt
		await prompt.present();
	}

	exit() {
		this.form.reset();
		this.contractFacade.selectContract(null);
		this.navCtrl.navigateBack(['dashboard', 'contracts']);
	}
}
