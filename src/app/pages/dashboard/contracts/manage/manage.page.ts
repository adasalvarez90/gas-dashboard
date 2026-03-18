import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { combineLatest, lastValueFrom } from 'rxjs';
import { take, map } from 'rxjs/operators';

import * as fromContract from 'src/app/store/contract';
import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { CommissionConfigFacade } from 'src/app/store/commission-config/commission-config.facade';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';
import { Contract, ContractBeneficiary } from 'src/app/store/contract/contract.model';
import { resolvePaymentsAndAccountStatus } from 'src/app/domain/contract/contract-derived-fields.util';
import { beneficiariesArrayValidator, beneficiaryAgeValidator } from 'src/app/domain/contract/beneficiary-validators.util';

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
	advisorsManager$ = this.advisors$.pipe(map((list) => list.filter((a) => a.hierarchyLevel === 'MANAGER')));
	advisorsCEO$ = this.advisors$.pipe(map((list) => list.filter((a) => a.hierarchyLevel === 'CEO')));
	advisorsKam$ = this.advisors$.pipe(map((list) => list.filter((a) => a.tags?.includes('KAM'))));
	advisorsSales$ = this.advisors$.pipe(map((list) => list.filter((a) => a.tags?.includes('SALES_DIRECTION'))));
	advisorsOps$ = this.advisors$.pipe(map((list) => list.filter((a) => a.tags?.includes('OPERATIONS'))));

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
		investor: ['', Validators.required],
		email: ['', [Validators.required, Validators.email]],
		investorRfc: ['', Validators.required],
		domicilio: ['', Validators.required],
		fundingAccount: ['', Validators.required],
		fundingBankInstitution: ['', Validators.required],
		returnsAccount: ['', Validators.required],
		returnsBankInstitution: ['', Validators.required],
		scheme: ['', Validators.required],
		yieldPercent: [null, Validators.required],
		liquidity: [null, Validators.required],
		term: [12],
		yieldFrequency: ['', Validators.required],
		source: ['COMUNIDAD', Validators.required],
		signatureDate: [null],
		signed: [false],
		docs: [false],
		docsComments: [''],
		beneficiaries: this.fb.array([], [beneficiariesArrayValidator()]),
		roles: this.fb.group({
			consultant: [''],
			kam: [''],
			manager: [''],
			salesDirector: [''],
			operations: [''],
			ceo: [''],
			referral: [''],
		}),
		initialCapital: [null],
	});

	previewSplits$ = combineLatest([
		this.form.valueChanges,
		this.advisorFacade.entities$,
		this.commissionConfigFacade.commissionConfigs$,
	]).pipe(
		map(([formValue, advisorsDic, configs]) => {
			if (!formValue?.source || !formValue?.roles) return [];
			const roles = formValue.roles;
			const sourceConfigs = configs.filter((c) => c.source === formValue.source);
			const getPercent = (role: string) =>
				sourceConfigs.find((c) => c.role === role)?.percentage || 0;
			this.preview = [
				{ role: 'CONSULTANT', uid: roles.consultant, percent: getPercent('CONSULTANT') },
				{ role: 'KAM', uid: roles.kam, percent: getPercent('KAM') },
				{ role: 'MANAGER', uid: roles.manager, percent: getPercent('MANAGER') },
				{ role: 'SALES_DIRECTION', uid: roles.salesDirector, percent: getPercent('SALES_DIRECTION') },
				{ role: 'OPERATIONS', uid: roles.operations, percent: getPercent('OPERATIONS') },
				{ role: 'CEO', uid: roles.ceo, percent: getPercent('CEO') },
				{ role: 'REFERRAL', uid: roles.referral, percent: getPercent('REFERRAL') },
			];
			return this.preview
				.filter((p) => p.uid)
				.map((p) => ({
					role: p.role,
					percent: p.percent,
					name: advisorsDic[p.uid]?.name || 'Sin asignar',
				}));
		}),
	);

	preview: { role: string; uid: string; percent: number }[] = [];

	roleLabels = {
		CONSULTANT: 'Consultora',
		KAM: 'KAM',
		MANAGER: 'Gerente',
		SALES_DIRECTION: 'Dirección ventas',
		OPERATIONS: 'Operaciones',
		CEO: 'CEO',
		REFERRAL: 'Referidora',
	};

	constructor(
		private contractFacade: ContractFacade,
		private advisorFacade: AdvisorFacade,
		private commissionConfigFacade: CommissionConfigFacade,
		private commissionPaymentFS: CommissionPaymentFirestoreService,
		private navCtrl: NavController,
		private fb: FormBuilder,
		private alertCtrl: AlertController,
		private ref: ChangeDetectorRef,
	) {}

	get beneficiariesArray(): FormArray {
		return this.form.get('beneficiaries') as FormArray;
	}

	private beneficiaryGroup(b?: Partial<ContractBeneficiary>): FormGroup {
		return this.fb.group({
			nombre: [b?.nombre ?? '', Validators.required],
			fechaNacimiento: [b?.fechaNacimiento ?? '', [Validators.required, beneficiaryAgeValidator()]],
			porcentaje: [
				b?.porcentaje ?? 100,
				[Validators.required, Validators.min(0.01), Validators.max(100)],
			],
		});
	}

	addBeneficiary() {
		const n = this.beneficiariesArray.length;
		this.beneficiariesArray.push(this.beneficiaryGroup({ porcentaje: n === 0 ? 100 : 0 }));
		this.beneficiariesArray.updateValueAndValidity();
		this.ref.markForCheck();
	}

	removeBeneficiary(i: number) {
		this.beneficiariesArray.removeAt(i);
		this.beneficiariesArray.updateValueAndValidity();
		this.ref.markForCheck();
	}

	async ngOnInit() {
		this.contract = await lastValueFrom(this.contractFacade.selectedContract$.pipe(take(1)));

		if (this.contract) {
			this.beneficiariesArray.clear();
			if (this.contract.beneficiaries?.length) {
				for (const b of this.contract.beneficiaries) {
					this.beneficiariesArray.push(this.beneficiaryGroup(b));
				}
			}
			this.form.patchValue({
				uid: this.contract.uid,
				investor: this.contract.investor,
				email: this.contract.email,
				investorRfc: this.contract.investorRfc || '',
				domicilio: this.contract.domicilio || '',
				fundingAccount: this.contract.fundingAccount || '',
				fundingBankInstitution: this.contract.fundingBankInstitution || '',
				returnsAccount: this.contract.returnsAccount || this.contract.fundingAccount || '',
				returnsBankInstitution: this.contract.returnsBankInstitution || '',
				scheme: this.contract.scheme,
				yieldPercent: this.contract.yieldPercent,
				liquidity: this.contract.liquidity,
				term: this.contract.term,
				yieldFrequency: this.contract.yieldFrequency,
				source: this.contract.source,
				signatureDate: this.contract.signatureDate,
				signed: this.contract.signed,
				docs: this.contract.docs,
				docsComments: this.contract.docsComments,
				roles: this.contract.roles,
				initialCapital: this.contract.initialCapital,
			});
			const signed = this.contract.signed;
			if (signed) {
				this.form.get('signatureDate')?.setValidators(Validators.required);
				this.form.get('initialCapital')?.setValidators([Validators.required, Validators.min(1)]);
			}
			this.form.get('signatureDate')?.updateValueAndValidity();
			this.form.get('initialCapital')?.updateValueAndValidity();
		}

		this.form.get('source')?.valueChanges.subscribe((source) => {
			if (source !== 'REFERIDORA') this.form.get('roles.referral')?.setValue('');
		});

		this.form.get('signed')?.valueChanges.subscribe((signed) => {
			if (!signed) {
				this.form.get('signatureDate')?.setValue(null);
				this.form.get('signatureDate')?.clearValidators();
				this.form.get('initialCapital')?.clearValidators();
			} else {
				this.form.get('signatureDate')?.setValidators(Validators.required);
				this.form.get('initialCapital')?.setValidators([Validators.required, Validators.min(1)]);
			}
			this.form.get('signatureDate')?.updateValueAndValidity();
			this.form.get('initialCapital')?.updateValueAndValidity();
		});

		this.ref.detectChanges();
	}

	getPercentForRole(role: string): number {
		return this.preview.find((p) => p.role === role)?.percent || 0;
	}

	private buildContractPayload(base: Partial<Contract>): Contract {
		const ben = (this.beneficiariesArray.value as ContractBeneficiary[]).filter(
			(x) => x?.nombre?.trim() || x?.fechaNacimiento,
		);
		const beneficiaries = ben.length ? ben : undefined;
		const v = this.form.getRawValue();
		return {
			...(base as Contract),
			investorRfc: (v.investorRfc ?? '').trim(),
			domicilio: (v.domicilio ?? '').trim(),
			fundingAccount: (v.fundingAccount ?? '').trim(),
			fundingBankInstitution: (v.fundingBankInstitution ?? '').trim(),
			returnsAccount: (v.returnsAccount ?? '').trim(),
			returnsBankInstitution: (v.returnsBankInstitution ?? '').trim(),
			beneficiaries,
		} as Contract;
	}

	async create() {
		if (this.form.invalid) return;
		const v = this.form.getRawValue();
		const { initialCapital, beneficiaries, ...rest } = v;
		const contractData = this.buildContractPayload({
			...rest,
			uid: '',
			contractStatus: 'PENDING',
			payments: '',
			accountStatus: '',
		} as Contract);

		if (v.signed === true && v.signatureDate != null && initialCapital != null && initialCapital >= 1) {
			this.contractFacade.createContractWithInitialTranche(contractData, initialCapital);
		} else {
			this.contractFacade.createContract(contractData);
		}
		this.exit();
	}

	async update() {
		if (!this.contract || this.form.invalid) return;
		const v = this.form.getRawValue();
		const merged = this.buildContractPayload({
			...this.contract,
			investor: v.investor,
			email: v.email,
			scheme: v.scheme,
			yieldPercent: v.yieldPercent,
			liquidity: v.liquidity,
			term: v.term,
			yieldFrequency: v.yieldFrequency,
			source: v.source,
			signatureDate: v.signatureDate,
			signed: v.signed,
			docs: v.docs,
			docsComments: v.docsComments,
			roles: v.roles,
			initialCapital: v.initialCapital,
			...resolvePaymentsAndAccountStatus(this.contract),
		});

		const prompt = await this.alertCtrl.create({
			header: 'Editar contrato',
			message: `¿Desea guardar los cambios del contrato de ${merged.investor}?`,
			buttons: [
				{ text: 'No', role: 'cancel' },
				{
					text: 'Sí',
					handler: () => {
						this.contractFacade.updateContract(merged);
						this.exit();
					},
				},
			],
		});
		await prompt.present();
	}

	async cancelContract() {
		if (!this.contract || this.contract.contractStatus === 'CANCELLED') return;
		const payments = await this.commissionPaymentFS.getCommissionPaymentsByContract(this.contract.uid);
		const pending = payments.filter((p) => !p.paid && !p.paidAt && !p.cancelled).length;
		const msg =
			pending > 0
				? `Hay **${pending} comisión(es) pendiente(s)** de pago. Al cancelar, las comisiones futuras no pagadas se anularán. ¿Continuar?`
				: '¿Cancelar este contrato? Las comisiones futuras no pagadas se marcarán como canceladas.';
		const alert = await this.alertCtrl.create({
			header: 'Cancelar contrato',
			message: msg.replace(/\*\*/g, ''),
			buttons: [
				{ text: 'No', role: 'cancel' },
				{
					text: 'Sí, cancelar',
					role: 'destructive',
					handler: () => this.contractFacade.cancelContract(this.contract!),
				},
			],
		});
		await alert.present();
	}

	async remove() {
		const contract = this.contract;
		if (!contract) return;
		const prompt = await this.alertCtrl.create({
			header: 'Eliminar contrato',
			message: `¿Desea eliminar el contrato para ${contract.investor}?`,
			buttons: [
				{ text: 'No', role: 'cancel' },
				{
					text: 'Sí',
					handler: () => {
						this.contractFacade.deleteContract(contract.uid);
						this.exit();
					},
				},
			],
		});
		await prompt.present();
	}

	exit() {
		this.form.reset();
		this.beneficiariesArray.clear();
		this.contractFacade.selectContract(null);
		this.navCtrl.navigateBack(['dashboard', 'contracts']);
	}
}
