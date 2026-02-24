import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Dictionary } from '@ngrx/entity';
// RxJS
import { combineLatest, lastValueFrom } from 'rxjs';
import { take, tap, map } from 'rxjs/operators';
// Store
import * as fromContract from 'src/app/store/contract';
// Facades
import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { CommissionConfigFacade } from 'src/app/store/commission-config/commission-config.facade';

@Component({
	selector: 'app-manage-contract',
	standalone: false,
	templateUrl: './manage.page.html',
	styleUrls: ['./manage.page.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagePage implements OnInit {
	advisors$ = this.advisorFacade.advisors$;
	advisorsDic$ = this.advisorFacade.entities$;
	advisorsManager$ = this.advisors$.pipe(
		map(list => list.filter(a => a.hierarchyLevel === 'MANAGER'))
	);
	advisorsCEO$ = this.advisors$.pipe(
		map(list => list.filter(a => a.hierarchyLevel === 'CEO'))
	);

	advisorsKam$ = this.advisors$.pipe(
		map(list => list.filter(a => a.tags?.includes('KAM')))
	);

	advisorsSales$ = this.advisors$.pipe(
		map(list => list.filter(a => a.tags?.includes('SALES_DIRECTION')))
	);

	advisorsOps$ = this.advisors$.pipe(
		map(list => list.filter(a => a.tags?.includes('OPERATIONS')))
	);

	contract$ = this.contractFacade.selectedContract$;
	contract: fromContract.Contract | null;

	sources = [
		{ value: 'COMUNIDAD', label: 'Comunidad' },
		{ value: 'RED_CALIDA', label: 'Red cálida' },
		{ value: 'DINERO_PROPIO', label: 'Dinero propio' },
		{ value: 'REFERIDORA', label: 'Referidora' },
	];

	form: FormGroup = this.fb.group({
		uid: [''],

		roles: this.fb.group({
			consultant: [''],
			kam: [''],
			manager: [''],
			salesDirector: [''],
			operations: [''],
			ceo: [''],
			referral: ['']
		}),

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

		source: ['COMUNIDAD', Validators.required],

		fullyFundedAt: [null],
	});

	previewSplits$ = combineLatest([
		this.form.valueChanges,
		this.advisorFacade.entities$,
		this.commissionConfigFacade.commissionConfigs$
	]).pipe(
		map(([formValue, advisorsDic, configs]) => {

			if (!formValue?.source || !formValue?.roles) {
				return [];
			}

			const roles = formValue.roles;

			// 🔥 filtramos configs por source seleccionado
			const sourceConfigs = configs.filter(
				c => c.source === formValue.source
			);


			// 🔥 helper para obtener porcentaje por rol
			const getPercent = (role: string) =>
				sourceConfigs.find(c => c.role === role)?.percentage || 0;

			this.preview = [
				{
					role: 'CONSULTANT',
					uid: roles.consultant,
					percent: getPercent('CONSULTANT')
				},
				{
					role: 'KAM',
					uid: roles.kam,
					percent: getPercent('KAM')
				},
				{
					role: 'MANAGER',
					uid: roles.manager,
					percent: getPercent('MANAGER')
				},
				{
					role: 'SALES_DIRECTION',
					uid: roles.salesDirector,
					percent: getPercent('SALES_DIRECTION')
				},
				{
					role: 'OPERATIONS',
					uid: roles.operations,
					percent: getPercent('OPERATIONS')
				},
				{
					role: 'CEO',
					uid: roles.ceo,
					percent: getPercent('CEO')
				},
				{
					role: 'REFERRAL',
					uid: roles.referral,
					percent: getPercent('REFERRAL')
				}
			];

			this.preview
				.filter(p => p.uid)
				.map(p => ({
					role: p.role,
					percent: p.percent,
					name: advisorsDic[p.uid]?.name || 'Sin asignar'
				}));


			return this.preview
				.filter(p => p.uid)
				.map(p => ({
					role: p.role,
					percent: p.percent,
					name: advisorsDic[p.uid]?.name || 'Sin asignar'
				}));
		})
	);

	preview = [];

	roleLabels = {
		CONSULTANT: 'Consultora',
		KAM: 'KAM',
		MANAGER: 'Gerente',
		SALES_DIRECTION: 'Dirección ventas',
		OPERATIONS: 'Operaciones',
		CEO: 'CEO',
		REFERRAL: 'Referidora'
	};

	constructor(
		private contractFacade: ContractFacade,
		private advisorFacade: AdvisorFacade,
		private commissionConfigFacade: CommissionConfigFacade,
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

		this.form.get('source')?.valueChanges.subscribe(source => {
			if (source !== 'REFERIDORA') {
				this.form.get('roles.referral')?.setValue('');
			}
		});

		this.ref.detectChanges();
	}

	getPercentForRole(role: string): number {
		return this.preview.find(p => p.role === role)?.percent || 0;
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
