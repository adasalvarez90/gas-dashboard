import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';

import { Contract } from 'src/app/store/contract/contract.model';
import { Deposit } from 'src/app/store/deposit/deposit.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';

import { DepositFacade } from 'src/app/store/deposit/deposit.facade';
import { TrancheFacade } from 'src/app/store/tranche/tranche.facade';
import { CommissionPaymentFacade } from 'src/app/store/commission-payment/commission-payment.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';

@Component({
	selector: 'app-contract-info',
	standalone: true,
	templateUrl: './contract-info.component.html',
	styleUrls: ['./contract-info.component.scss'],
	imports: [
		CommonModule,
		IonicModule
	],
})
export class ContractInfoComponent implements OnInit, OnChanges {

	@Input() contract!: Contract;
	@Input() activeTab: 'info' | 'deposits' | 'commissions' = 'info';

	tranches$: Observable<Tranche[]> = this.trancheFacade.tranches$;

	deposits$: Observable<Deposit[]> = this.depositFacade.deposits$;

	commissionPayments$: Observable<CommissionPayment[]> = this.commissionPaymentFacade.commissionPayments$;

	advisorsDic$ = this.advisorFacade.entities$;

	selectedTrancheUid: string | null = null;

	readonly selectedTrancheUid$ = new BehaviorSubject<string | null>(null);

	private paymentsForSelectedTranche$ = combineLatest([
		this.commissionPayments$,
		this.selectedTrancheUid$,
	]).pipe(
		map(([payments, uid]) => (uid ? payments.filter((p) => p.trancheUid === uid) : [])),
	);

	commissionSummary$ = this.paymentsForSelectedTranche$.pipe(
		map((payments) => this.computeSummary(payments)),
	);

	commissionGroups$ = combineLatest([this.paymentsForSelectedTranche$, this.advisorsDic$]).pipe(
		map(([payments, advisorsDic]) => {
			type Group = {
				key: string;
				advisorUid: string;
				role: string;
				name: string;
				splitLabel: number | null;
				pendingAmount: number;
				paidAmount: number;
				totalAmount: number;
				nextDueDate: number | null;
				payments: CommissionPayment[];
			};

			const groups = new Map<string, Group & { splitSet: Set<number>; payments: CommissionPayment[] }>();

			for (const p of payments) {
				const key = `${p.advisorUid}::${p.role}`;
				const existing = groups.get(key);

				const name =
					(advisorsDic as any)?.[p.advisorUid]?.name ||
					(advisorsDic as any)?.[p.advisorUid]?.displayName ||
					'Desconocido';

				const isPaid = !!p.paidAt || p.paid;
				const isPending = !isPaid && !p.cancelled;

				const amount = p.amount || 0;

				if (!existing) {
					groups.set(key, {
						key,
						advisorUid: p.advisorUid,
						role: p.role,
						name,
						splitLabel: null,
						pendingAmount: isPending ? amount : 0,
						paidAmount: isPaid ? amount : 0,
						totalAmount: amount,
						nextDueDate: isPending ? (p.dueDate ?? null) : null,
						splitSet: new Set([p.roleSplitPercent]),
						payments: [p],
					});
				} else {
					existing.totalAmount += amount;
					if (isPaid) existing.paidAmount += amount;
					if (isPending) {
						existing.pendingAmount += amount;
						existing.nextDueDate = existing.nextDueDate ? Math.min(existing.nextDueDate, p.dueDate ?? existing.nextDueDate) : (p.dueDate ?? null);
					}
					existing.splitSet.add(p.roleSplitPercent);
					existing.payments.push(p);
				}
			}

			const result: Group[] = Array.from(groups.values()).map((g) => ({
				key: g.key,
				advisorUid: g.advisorUid,
				role: g.role,
				name: g.name,
				splitLabel: g.splitSet.size === 1 ? Array.from(g.splitSet)[0] : null,
				pendingAmount: g.pendingAmount,
				paidAmount: g.paidAmount,
				totalAmount: g.totalAmount,
				nextDueDate: g.nextDueDate,
				payments: [...g.payments].sort((a, b) => {
					const da = a.dueDate ?? 0;
					const db = b.dueDate ?? 0;
					if (da !== db) return da - db;
					return (a.installment ?? 0) - (b.installment ?? 0);
				}),
			}));

			result.sort((a, b) => {
				const ap = a.pendingAmount > 0 ? 0 : 1;
				const bp = b.pendingAmount > 0 ? 0 : 1;
				if (ap !== bp) return ap - bp;
				return b.totalAmount - a.totalAmount;
			});

			return result;
		}),
	);

	/** Keys of "Se debe a" groups whose detail is expanded */
	expandedGroupKeys = new Set<string>();

	toggleGroupDetail(key: string) {
		if (this.expandedGroupKeys.has(key)) {
			this.expandedGroupKeys = new Set();
		} else {
			this.expandedGroupKeys = new Set([key]);
		}
	}

	isGroupExpanded(key: string): boolean {
		return this.expandedGroupKeys.has(key);
	}

	computeSummary(payments: CommissionPayment[]): {
		pendingAmount: number;
		paidAmount: number;
		cancelledAmount: number;
		totalAmount: number;
		pendingCount: number;
		paidCount: number;
		cancelledCount: number;
		totalCount: number;
	} {
		const paid = payments.filter((p) => !!p.paidAt || p.paid);
		const pending = payments.filter((p) => !p.paidAt && !p.paid && !p.cancelled);
		const cancelled = payments.filter((p) => p.cancelled);
		const sum = (arr: CommissionPayment[]) => arr.reduce((acc, p) => acc + (p.amount || 0), 0);
		return {
			pendingAmount: sum(pending),
			paidAmount: sum(paid),
			cancelledAmount: sum(cancelled),
			totalAmount: sum(payments),
			pendingCount: pending.length,
			paidCount: paid.length,
			cancelledCount: cancelled.length,
			totalCount: payments.length,
		};
	}

	getTrancheSummary$(trancheUid: string): Observable<{
		pendingAmount: number;
		paidAmount: number;
		totalAmount: number;
		pendingCount: number;
		paidCount: number;
		totalCount: number;
	}> {
		return this.commissionPayments$.pipe(
			map((payments) => payments.filter((p) => p.trancheUid === trancheUid)),
			map((payments) => this.computeSummary(payments)),
		);
	}

	commissionCuts$ = this.paymentsForSelectedTranche$.pipe(
		map((payments) => {
			type CutGroup = {
				cutDate: number;
				pendingAmount: number;
				paidAmount: number;
				totalAmount: number;
				pendingCount: number;
				paidCount: number;
			};

			const mapByCut = new Map<number, CutGroup>();
			for (const p of payments) {
				const cutDate = p.cutDate;
				if (!cutDate) continue;

				const existing = mapByCut.get(cutDate) ?? {
					cutDate,
					pendingAmount: 0,
					paidAmount: 0,
					totalAmount: 0,
					pendingCount: 0,
					paidCount: 0,
				};

				const isPaid = !!p.paidAt || p.paid;
				const isPending = !isPaid && !p.cancelled;
				const amount = p.amount || 0;

				existing.totalAmount += amount;
				if (isPaid) {
					existing.paidAmount += amount;
					existing.paidCount += 1;
				}
				if (isPending) {
					existing.pendingAmount += amount;
					existing.pendingCount += 1;
				}

				mapByCut.set(cutDate, existing);
			}

			const cuts = Array.from(mapByCut.values());
			cuts.sort((a, b) => a.cutDate - b.cutDate);
			return cuts;
		}),
	);

	readonly PAYMENT_TYPE_LABELS: Record<string, string> = {
		IMMEDIATE: 'Inmediato',
		RECURRING: 'Recurrente',
		FINAL: 'Final',
		ADJUSTMENT: 'Ajuste',
	};

	readonly ROLE_LABELS: Record<string, string> = {
		CONSULTANT: 'Consultor(a)',
		CONSULTORA: 'Consultora',
		consultant: 'Consultor(a)',
		MANAGER: 'Gerente',
		manager: 'Gerente',
		KAM: 'KAM',
		kam: 'KAM',
		SALES_DIRECTION: 'Dir. Ventas',
		SALESDIRECTION: 'Dir. Ventas',
		salesDirector: 'Dir. Ventas',
		OPERATIONS: 'Operaciones',
		operations: 'Operaciones',
		CEO: 'CEO',
		ceo: 'CEO',
		REFERRAL: 'Referido',
		referral: 'Referido',
	};

	paymentTypeLabel(type: string): string {
		if (!type) return '';
		return this.PAYMENT_TYPE_LABELS[type] ?? this.PAYMENT_TYPE_LABELS[type.toUpperCase()] ?? type;
	}

	roleLabel(role: string): string {
		if (!role) return '';
		return this.ROLE_LABELS[role] ?? this.ROLE_LABELS[role.toUpperCase()] ?? role;
	}

	getAdvisorName(advisorsDic: Record<string, { name?: string }> | null, uid: string | undefined): string {
		if (!uid) return '—';
		const name = advisorsDic?.[uid]?.name;
		return name ?? uid;
	}

	readonly CONTRACT_STATUS_LABELS: Record<string, string> = {
		PENDING: 'Pendiente',
		ACTIVE: 'Activo',
		FINISHED: 'Finalizado',
		CANCELLED: 'Cancelado',
	};

	contractStatusLabel(status: string): string {
		if (!status) return '';
		return this.CONTRACT_STATUS_LABELS[status] ?? status;
	}

	constructor(
		private depositFacade: DepositFacade,
		private trancheFacade: TrancheFacade,
		private advisorFacade: AdvisorFacade,
		private commissionPaymentFacade: CommissionPaymentFacade,
	) {}

	ngOnInit() {
		this.trancheFacade.loadTranches(this.contract?.uid || '');
		this.advisorFacade.loadAdvisors();
		if (this.activeTab === 'commissions' && this.contract?.uid) {
			this.commissionPaymentFacade.loadCommissionPaymentsByContract(this.contract.uid);
		}
	}

	ngOnChanges(changes: SimpleChanges) {
		if ((changes['activeTab'] || changes['contract']) && this.activeTab === 'commissions' && this.contract?.uid) {
			this.commissionPaymentFacade.loadCommissionPaymentsByContract(this.contract.uid);
		}
	}

	loadData(trancheUid: string) {
		this.depositFacade.loadDeposits(trancheUid);
		if (this.activeTab !== 'commissions') {
			this.commissionPaymentFacade.loadCommissionPayments(trancheUid);
		}
	}

	selectTranche(trancheUid: string | null) {
		if (trancheUid === null) {
			this.selectedTrancheUid = null;
			this.selectedTrancheUid$.next(null);
			return;
		}
		if (this.selectedTrancheUid === trancheUid) {
			this.selectedTrancheUid = null;
			this.selectedTrancheUid$.next(null);
			return;
		}
		this.selectedTrancheUid = trancheUid;
		this.selectedTrancheUid$.next(trancheUid);
		this.loadData(trancheUid);
	}

	createTranche() {
		this.trancheFacade.createTranche(this.contract.uid, 100000);
	}

	deposit(tranche) {
		this.selectTranche(tranche.uid);
		
		// Create a new deposit object
		const newDeposit: Deposit = {
			contractUid: this.contract.uid,
			trancheUid: tranche.uid,
			amount: 50000, // Example amount, replace with actual value
			depositedAt: Date.now(),
			uid: '' // This will be generated by Firestore
		};

		// Call the service to create the deposit
		this.depositFacade.createDeposit(newDeposit);
	}

	markCutAsPaid(cutDate: number) {
		this.commissionPaymentFacade.markPaidByCutDate(cutDate, Date.now());
	}

	markAdvisorAsPaid(advisorUid: string) {
		if (!this.selectedTrancheUid) return;
		this.commissionPaymentFacade.markPaidByTrancheAndAdvisor(this.selectedTrancheUid, advisorUid, Date.now());
	}

}