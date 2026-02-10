import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

// RxJS
import { lastValueFrom } from 'rxjs';
import { take, tap } from 'rxjs/operators';

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
	advisors$ = this.advisorFacade.advisors$.pipe(
		tap(advisors => {
			this.advisorsSnapshot = advisors;
		})
	);
	contract$ = this.contractFacade.selectedContract$;
	contract: fromContract.Contract | null;

	advisorsSnapshot: any[] = [];
	selectedAdvisorName: string | null = null;

	form: FormGroup = this.fb.group({
		uid: [''],

		advisorUid: ['', Validators.required],
		investor: ['', Validators.required],
		email: ['', [Validators.required, Validators.email]],
		clientAccount: [''],

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

		docs: [false],
		docsComments: [''],

		beneficiaries: [''],
		signed: [false],

		regularComision: [0],
		dinamicComision: [0],
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
			const advisor = this.advisorsSnapshot.find(a => a.uid === this.contract.advisorUid);
			this.selectedAdvisorName = advisor ? advisor.name : null;
		} else {
			this.form.reset();
		}

		this.form.get('advisorUid')?.valueChanges.subscribe(uid => {
			console.log('Selected advisor UID:', uid);
			const advisor = this.advisorsSnapshot.find(a => a.uid === uid);
			this.selectedAdvisorName = advisor ? advisor.name : null;
		});

		this.ref.detectChanges();
	}

	async create() {
		// Get the form value
		const contract = this.form.value;
		// Create new user
		this.contractFacade.createContract(contract);
		// Exit
		this.exit();
	}

	async update() {
		// Get the form value
		const contract = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Editar contrato`,
			message: `¿Desea editar el contrato para ${contract.investor}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.contractFacade.updateContract(contract);
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
		const contract = this.form.value;
		// Create the update alert
		const prompt = await this.alertCtrl.create({
			header: `Eliminar contrato`,
			message: `¿Desea eliminar el contrato para ${contract.investor}?`,
			buttons: [{
				text: 'No',
				role: 'cancel'
			}, {
				text: 'Sí',
				handler: () => {
					// Create new user
					this.contractFacade.deleteContract(contract.uid);
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
