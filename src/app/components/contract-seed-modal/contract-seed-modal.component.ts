import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, LoadingController, ToastController } from '@ionic/angular';
import { Contract } from 'src/app/store/contract/contract.model';
import { Advisor } from 'src/app/store/advisor/advisor.model';
import { ContractFirestoreService } from 'src/app/services/contract-firestore.service';
import { TrancheFirestoreService } from 'src/app/services/tranche-firestore.service';
import { TrancheDepositService } from 'src/app/domain/tranche/tranche-deposit.service';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { ContractFacade } from 'src/app/store/contract/contract.facade';
import { CommissionPaymentFacade } from 'src/app/store/commission-payment/commission-payment.facade';
import { toCanonicalMexicoDateTimestamp } from 'src/app/domain/time/mexico-time.util';
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
	selector: 'app-contract-seed-modal',
	standalone: true,
	templateUrl: './contract-seed-modal.component.html',
	styleUrls: ['./contract-seed-modal.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class ContractSeedModalComponent {
	/** Monto total del tranche (capital inicial). */
	initialAmount = 100000;
	/** Cantidad de depósitos. */
	numDeposits = 3;
	/** Monto por depósito (repartido igual si no se especifica). Dejar vacío para repartir automático. */
	depositAmount = 0;
	/** Fecha de firma del contrato (YYYY-MM-DD). */
	signatureDate = '';
	/** Fecha del tranche / anexo (YYYY-MM-DD). Por defecto = fecha firma. */
	trancheDate = '';
	/** Fecha del primer depósito (YYYY-MM-DD). */
	firstDepositDate = '';
	/** Días entre depósitos. 0 = todos el mismo día. */
	daysBetweenDeposits = 0;

	advisors$ = this.advisorFacade.advisors$;
	/** Asesora que el usuario selecciona (consultora principal). Los demás roles se auto-completan según tags/hierarchy. */
	advisorUid = '';

	constructor(
		private modalCtrl: ModalController,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
		private contractFS: ContractFirestoreService,
		private trancheFS: TrancheFirestoreService,
		private trancheDepositService: TrancheDepositService,
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private commissionPaymentFacade: CommissionPaymentFacade,
	) {}

	ngOnInit() {
		const today = new Date().toISOString().slice(0, 10);
		this.signatureDate = today;
		this.trancheDate = today;
		this.firstDepositDate = today;
	}

	cancel() {
		this.modalCtrl.dismiss(undefined, 'cancel');
	}

	/**
	 * La asesora seleccionada va en consultant. Para los demás roles, elige el primer
	 * asesor que cumpla el rol (tags/hierarchy). Si la seleccionada califica, se usa;
	 * si no, first del filtro; si no hay, fallback a la seleccionada.
	 */
	private resolveRoles(advisors: Advisor[], selected: Advisor): Contract['roles'] {
		const kams = advisors.filter((a) => a.tags?.includes('KAM'));
		const managers = advisors.filter((a) => a.hierarchyLevel === 'MANAGER');
		const sales = advisors.filter((a) => a.tags?.includes('SALES_DIRECTION'));
		const ops = advisors.filter((a) => a.tags?.includes('OPERATIONS'));
		const ceos = advisors.filter((a) => a.hierarchyLevel === 'CEO');

		const pickForRole = (candidates: Advisor[], fallbackUid: string): string => {
			const fromSelection = candidates.find((a) => a.uid === selected.uid);
			if (fromSelection) return fromSelection.uid;
			if (candidates.length > 0) return candidates[0].uid;
			return fallbackUid;
		};

		const consultantUid = selected.uid;

		return {
			consultant: consultantUid,
			kam: pickForRole(kams, consultantUid),
			manager: pickForRole(managers, consultantUid),
			salesDirector: pickForRole(sales, consultantUid),
			operations: pickForRole(ops, consultantUid),
			ceo: pickForRole(ceos, consultantUid),
		};
	}

	async submit() {
		const sigTs = toCanonicalMexicoDateTimestamp(this.signatureDate);
		const trancheTs = toCanonicalMexicoDateTimestamp(this.trancheDate || this.signatureDate);
		const firstDepTs = toCanonicalMexicoDateTimestamp(this.firstDepositDate || this.signatureDate);

		if (!sigTs || !trancheTs || !firstDepTs) {
			const t = await this.toastCtrl.create({ color: 'danger', message: 'Fechas inválidas', duration: 3000 });
			await t.present();
			return;
		}

		if (this.initialAmount <= 0 || this.numDeposits < 1) {
			const t = await this.toastCtrl.create({ color: 'danger', message: 'Monto y depósitos deben ser válidos', duration: 3000 });
			await t.present();
			return;
		}

		const advisors = await lastValueFrom(this.advisors$.pipe(take(1)));
		if (advisors.length === 0) {
			const t = await this.toastCtrl.create({ color: 'danger', message: 'Crea al menos un asesor antes', duration: 3000 });
			await t.present();
			return;
		}

		// Si no eligió, usamos el primero de la lista
		const selectedAdvisor = this.advisorUid
			? advisors.find((a) => a.uid === this.advisorUid)
			: advisors[0];
		if (!selectedAdvisor) {
			const t = await this.toastCtrl.create({ color: 'danger', message: 'Asesora no encontrada', duration: 3000 });
			await t.present();
			return;
		}

		const roles = this.resolveRoles(advisors, selectedAdvisor);

		const loading = await this.loadingCtrl.create({ message: 'Creando contrato y depósitos…' });
		await loading.present();

		try {
			// Montos por depósito
			const amounts: number[] = [];
			if (this.depositAmount > 0) {
				for (let i = 0; i < this.numDeposits; i++) amounts.push(this.depositAmount);
				const sum = amounts.reduce((a, b) => a + b, 0);
				if (Math.abs(sum - this.initialAmount) > 0.01) {
					amounts[amounts.length - 1] += this.initialAmount - sum;
				}
			} else {
				const base = Math.floor(this.initialAmount / this.numDeposits);
				const rem = this.initialAmount - base * this.numDeposits;
				for (let i = 0; i < this.numDeposits; i++) amounts.push(base + (i === this.numDeposits - 1 ? rem : 0));
			}

			// Fechas de depósitos
			const dayMs = 24 * 60 * 60 * 1000;
			const depositDates: number[] = [];
			for (let i = 0; i < this.numDeposits; i++) {
				const offsetDays = i * (this.daysBetweenDeposits || 0);
				const ts = firstDepTs + offsetDays * dayMs;
				depositDates.push(toCanonicalMexicoDateTimestamp(ts)!);
			}

			// Contrato base
			const contractData: Contract = {
				uid: '',
				investor: `Inversionista prueba ${Date.now().toString(36)}`,
				email: 'prueba@test.local',
				investorRfc: 'XAXX010101000',
				domicilio: 'CDMX',
				fundingAccount: '012345678901234567',
				fundingBankInstitution: 'BBVA',
				returnsAccount: '012345678901234567',
				returnsBankInstitution: 'BBVA',
				scheme: 'A',
				source: 'COMUNIDAD',
				yieldPercent: 12,
				liquidity: 12,
				term: 12,
				yieldFrequency: 'monthly',
				payments: '',
				accountStatus: '',
				signed: true,
				signatureDate: sigTs,
				initialCapital: this.initialAmount,
				docs: false,
				docsComments: '',
				contractStatus: 'PENDING',
				roles,
				_create: 0,
				_on: true,
			};

			const contract = await this.contractFS.createContractWithInitialTranche(contractData, this.initialAmount);
			const tranches = await this.trancheFS.getTranches(contract.uid);
			const tranche = tranches[0];
			if (!tranche) {
				throw new Error('No se creó el tranche');
			}

			// Actualizar signedAt del tranche si es distinto a firma
			if (trancheTs !== sigTs) {
				tranche.signedAt = trancheTs;
				await this.trancheFS.updateTranche(tranche);
			}

			for (let i = 0; i < this.numDeposits; i++) {
				const deposit = {
					uid: '',
					contractUid: contract.uid,
					trancheUid: tranche.uid,
					amount: amounts[i],
					depositedAt: depositDates[i],
					sourceAccount: 'funding' as const,
				};
				await this.trancheDepositService.registerDeposit(deposit);
			}

			await loading.dismiss();

			const toast = await this.toastCtrl.create({
				color: 'primary',
				message: `Contrato "${contract.investor}" creado con ${this.numDeposits} depósito(s).`,
				duration: 3000,
			});
			await toast.present();
			this.contractFacade.loadContracts();
			this.contractFacade.selectContract(null as any);
			this.commissionPaymentFacade.loadCommissionPaymentsForCuts();
			this.modalCtrl.dismiss({ contractUid: contract.uid }, 'ok');
		} catch (err: any) {
			await loading.dismiss();
			const toast = await this.toastCtrl.create({
				color: 'danger',
				message: err?.message || 'Error al crear',
				duration: 4000,
			});
			await toast.present();
		}
	}
}
