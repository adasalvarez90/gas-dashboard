import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { combineLatest, map, BehaviorSubject, take } from 'rxjs';

import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { CommissionPaymentFacade } from 'src/app/store/commission-payment/commission-payment.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { Contract } from 'src/app/store/contract/contract.model';
import { ContractFacade } from 'src/app/store/contract/contract.facade';

import { AdvisorCutSummary } from 'src/app/models/commission-cuts-summary.model';
import { CommissionCutAdvisorState } from 'src/app/models/commission-cut-state.model';
import { CommissionCutStateFirestoreService } from 'src/app/services/commission-cut-state-firestore.service';
import { CommissionCutAttachmentService } from 'src/app/services/commission-cut-attachment.service';
import { CommissionCutsPdfService } from 'src/app/services/commission-cuts-pdf.service';
import {
	getDefaultCutDateRange,
	getInvoiceDeadline,
	getNextCutDate,
	getPaymentDeadline,
	isInvoiceLate,
	isInvoiceOverdue,
	isPaymentOverdue,
} from 'src/app/domain/commission-cut/commission-cut-deadlines.util';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';

export type AdvisorCutSummaryWithState = AdvisorCutSummary & {
	state: CommissionCutAdvisorState | null;
	invoiceDeadline?: number;
	paymentDeadline?: number;
	isOverdue: boolean;
	uploadingInvoice?: boolean;
	uploadingReceipt?: boolean;
	contractBreakdown: {
		contractUid: string;
		investorName: string;
		contractAmount: number | null;
		totalAmount: number;
		pendingAmount: number;
		paidAmount: number;
		pendingCount: number;
		paidCount: number;
		payments: CommissionPayment[];
	}[];
};

@Component({
	selector: 'app-commission-cuts',
	standalone: false,
	templateUrl: './commission-cuts.page.html',
	styleUrls: ['./commission-cuts.page.scss'],
})
export class CommissionCutsPage implements OnInit {
	commissionPayments$ = this.commissionPaymentFacade.commissionPayments$;
	advisors$ = this.advisorFacade.entities$;
	contracts$ = this.contractFacade.contracts$;
	loading$ = this.commissionPaymentFacade.loading$;

	filterCutDate$ = new BehaviorSubject<number | null>(null);
	filterAdvisorUid$ = new BehaviorSubject<string | null>(null);
	viewMode$ = new BehaviorSubject<'all' | 'noncompliance'>('all');

	@ViewChild('cutSelect', { read: ElementRef }) private cutSelectRef?: ElementRef;
	@ViewChild('advisorSelect', { read: ElementRef }) private advisorSelectRef?: ElementRef;

	stateStates$ = new BehaviorSubject<CommissionCutAdvisorState[]>([]);

	cutDates$ = this.commissionPayments$.pipe(
		map((payments) => {
			const set = new Set<number>();
			payments.forEach((p) => p.cutDate && set.add(p.cutDate));
			return Array.from(set).sort((a, b) => a - b);
		})
	);

	/** Todas las asesoras para el filtro (entities$ = diccionario por uid) */
	advisorsForFilter$ = this.advisors$.pipe(
		map((entities) => {
			const dict = entities as Record<string, { uid?: string; name?: string }> | null;
			if (!dict) return [];
			return Object.entries(dict)
				.map(([uid, a]) => ({ uid, name: a?.name ?? 'Desconocido' }))
				.sort((a, b) => a.name.localeCompare(b.name));
		})
	);

	advisorSummaries$ = combineLatest([
		this.commissionPayments$,
		this.advisors$,
		this.filterCutDate$,
		this.filterAdvisorUid$,
	]).pipe(
		map(([payments, advisorsDic, filterCut, filterAdvisor]) => {
			const byCutAdvisor = new Map<string, AdvisorCutSummary>();

			for (const p of payments) {
				if (p.cancelled) continue;
				if (filterCut != null && p.cutDate !== filterCut) continue;
				if (filterAdvisor != null && p.advisorUid !== filterAdvisor) continue;

				const key = `${p.cutDate}::${p.advisorUid}`;
				const name =
					(advisorsDic as Record<string, { name?: string }>)?.[p.advisorUid]?.name ??
					(advisorsDic as Record<string, { displayName?: string }>)?.[p.advisorUid]?.displayName ??
					'Desconocido';
				const amount = p.amount ?? 0;
				const isPaid = !!p.paidAt || p.paid;

				let existing = byCutAdvisor.get(key);
				if (!existing) {
					const breakdownMap = new Map<string, { amount: number; count: number }>();
					const type = p.paymentType ?? 'OTHER';
					const b = breakdownMap.get(type) ?? { amount: 0, count: 0 };
					b.amount += amount;
					b.count += 1;
					breakdownMap.set(type, b);

					existing = {
						advisorUid: p.advisorUid,
						advisorName: name,
						cutDate: p.cutDate,
						totalAmount: amount,
						pendingAmount: isPaid ? 0 : amount,
						paidAmount: isPaid ? amount : 0,
						payments: [p],
						breakdown: [],
						scheme: p.scheme ?? '—',
						contractUids: p.contractUid ? [p.contractUid] : [],
					};
					existing.breakdown = Array.from(breakdownMap.entries()).map(([k, v]) => ({
						paymentType: k,
						amount: v.amount,
						count: v.count,
					}));
					byCutAdvisor.set(key, existing);
				} else {
					existing.totalAmount += amount;
					existing.pendingAmount += isPaid ? 0 : amount;
					existing.paidAmount += isPaid ? amount : 0;
					existing.payments.push(p);
					if (p.contractUid && !existing.contractUids.includes(p.contractUid)) {
						existing.contractUids.push(p.contractUid);
					}
					const type = p.paymentType ?? 'OTHER';
					const b = existing.breakdown.find((x) => x.paymentType === type);
					if (b) {
						b.amount += amount;
						b.count += 1;
					} else {
						existing.breakdown.push({ paymentType: type, amount, count: 1 });
					}
				}
			}

			const result = Array.from(byCutAdvisor.values());
			result.sort((a, b) => {
				if (a.cutDate !== b.cutDate) return a.cutDate - b.cutDate;
				return a.advisorName.localeCompare(b.advisorName);
			});
			return result;
		})
	);

	/** Resúmenes fusionados con estado y plazos */
	advisorSummariesWithState$ = combineLatest([
		this.advisorSummaries$,
		this.contracts$,
		this.stateStates$,
		this.viewMode$,
	]).pipe(
		map(([summaries, contracts, states, viewMode]) => {
			const stateMap = new Map<string, CommissionCutAdvisorState>();
			states.forEach((s) => stateMap.set(`${s.cutDate}::${s.advisorUid}`, s));
			const contractMap = new Map<string, Contract>();
			contracts.forEach((c) => contractMap.set(c.uid, c));

			let result: AdvisorCutSummaryWithState[] = summaries.map((s) => {
				const state = stateMap.get(`${s.cutDate}::${s.advisorUid}`) ?? null;
				const invoiceDeadline = state?.breakdownSentAt ? getInvoiceDeadline(state.breakdownSentAt) : undefined;
				const paymentDeadline = state?.invoiceSentAt ? getPaymentDeadline(state.invoiceSentAt) : undefined;
				const invOverdue = invoiceDeadline ? isInvoiceOverdue(state?.invoiceSentAt, invoiceDeadline) : false;
				const payOverdue = paymentDeadline ? isPaymentOverdue(state?.receiptSentAt, paymentDeadline) : false;
				// Incumplimiento basado en la fecha (YYYY-MM-DD) en México (evita saltos por timezone).
				const todayKeyInMx = this.getMexicoDateKey(Date.now());
				const isAnyPendingPaymentOverdue =
					(s.payments?.length ?? 0) > 0 &&
					s.payments.some((p) => {
						const isPaid = !!p.paidAt || p.paid;
						return (
							!isPaid &&
							!p.cancelled &&
							typeof p.cutDate === 'number' &&
							todayKeyInMx > this.getMexicoDateKey(p.cutDate)
						);
					});
				const isOverdue =
					(s.pendingAmount > 0 && invOverdue) ||
					(s.pendingAmount > 0 && payOverdue) ||
					(s.pendingAmount > 0 && !state?.breakdownSentAt && this.isBreakdownOverdue(s.cutDate)) ||
					(s.pendingAmount > 0 && isAnyPendingPaymentOverdue);

				return {
					...s,
					state,
					invoiceDeadline,
					paymentDeadline,
					isOverdue,
					contractBreakdown: this.groupPaymentsByContract(s.payments, contractMap),
				};
			});

			if (viewMode === 'noncompliance') {
				// Solo las que realmente están atrasadas/incumplidas.
				result = result.filter((r) => r.isOverdue);
			}

			return result;
		})
	);

	nonComplianceCount$ = this.advisorSummariesWithState$.pipe(
		map((summaries) => summaries.filter((s) => s.isOverdue).length)
	);

	cutDateLabel$ = this.filterCutDate$.pipe(
		map((cd) => (cd ? new Date(cd).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined))
	);

	readonly STATE_LABELS: Record<string, string> = {
		PENDING: 'Pendiente',
		BREAKDOWN_SENT: 'Desglose enviado',
		SENT_TO_PAYMENT: 'Enviada a pago',
		PAID: 'Pagada',
	};

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

	constructor(
		private commissionPaymentFacade: CommissionPaymentFacade,
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private stateService: CommissionCutStateFirestoreService,
		private attachmentService: CommissionCutAttachmentService,
		private pdfService: CommissionCutsPdfService,
		private paymentFirestore: CommissionPaymentFirestoreService
	) {}

	private openIonSelect(selectRef?: ElementRef) {
		const el = selectRef?.nativeElement as any;
		if (!el) return;

		// Ionic's web component usually exposes `open()`; fallback to click for safety.
		if (typeof el.open === 'function') el.open();
		else if (typeof el.click === 'function') el.click();
	}

	private getMexicoDateKey(timestampMs: number): string {
		// Formato ISO YYYY-MM-DD en zona horaria de México (para comparar por fecha, sin errores de timezone).
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: 'America/Mexico_City',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(new Date(timestampMs));
	}

	openCutSelect() {
		this.openIonSelect(this.cutSelectRef);
	}

	openAdvisorSelect() {
		this.openIonSelect(this.advisorSelectRef);
	}

	ngOnInit() {
		this.advisorFacade.loadAdvisors();
		this.contractFacade.loadContracts();
		const { startCutDate, endCutDate } = getDefaultCutDateRange();
		this.commissionPaymentFacade.loadCommissionPaymentsForCuts(startCutDate, endCutDate);
		this.loadStates(startCutDate, endCutDate);
	}

	private groupPaymentsByContract(
		payments: CommissionPayment[],
		contractMap: Map<string, Contract>,
	): {
		contractUid: string;
		investorName: string;
		contractAmount: number | null;
		totalAmount: number;
		pendingAmount: number;
		paidAmount: number;
		pendingCount: number;
		paidCount: number;
		payments: CommissionPayment[];
	}[] {
		const byContract = new Map<string, CommissionPayment[]>();
		for (const p of payments) {
			if (!p.contractUid) continue;
			const arr = byContract.get(p.contractUid) ?? [];
			arr.push(p);
			byContract.set(p.contractUid, arr);
		}

		return Array.from(byContract.entries())
			.map(([contractUid, ps]) => ({
				contractUid,
				investorName: contractMap.get(contractUid)?.investor ?? '—',
				contractAmount: contractMap.get(contractUid)?.initialCapital ?? null,
				payments: [...ps].sort((a, b) => {
					const da = a.dueDate ?? 0;
					const db = b.dueDate ?? 0;
					if (da !== db) return da - db;
					return (a.installment ?? 0) - (b.installment ?? 0);
				}),
				totalAmount: ps.reduce((acc, p) => acc + (p.amount ?? 0), 0),
				pendingAmount: ps
					.filter((p) => !p.paidAt && !p.paid && !p.cancelled)
					.reduce((acc, p) => acc + (p.amount ?? 0), 0),
				paidAmount: ps
					.filter((p) => !!p.paidAt || p.paid)
					.reduce((acc, p) => acc + (p.amount ?? 0), 0),
				pendingCount: ps.filter((p) => !p.paidAt && !p.paid && !p.cancelled).length,
				paidCount: ps.filter((p) => !!p.paidAt || p.paid).length,
			}))
			.sort((a, b) => a.contractUid.localeCompare(b.contractUid));
	}

	private expandedSummaryKey: string | null = null;
	expandedContractKeys = new Set<string>();

	breakdownRowKey(s: AdvisorCutSummaryWithState): string {
		return `breakdown::${s.advisorUid}::${s.cutDate}`;
	}

	toggleSummaryExpanded(s: AdvisorCutSummaryWithState) {
		const key = this.breakdownRowKey(s);
		const next = this.expandedSummaryKey === key ? null : key;
		this.expandedSummaryKey = next;
		if (next === null) {
			this.expandedContractKeys = new Set();
		} else {
			this.expandedContractKeys = new Set();
		}
	}

	isSummaryExpanded(s: AdvisorCutSummaryWithState): boolean {
		return this.expandedSummaryKey === this.breakdownRowKey(s);
	}

	private contractBreakdownKey(s: AdvisorCutSummaryWithState, contractUid: string): string {
		return `contract::${s.advisorUid}::${s.cutDate}::${contractUid}`;
	}

	toggleContractExpanded(s: AdvisorCutSummaryWithState, contractUid: string) {
		const key = this.contractBreakdownKey(s, contractUid);
		const next = new Set(this.expandedContractKeys);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		this.expandedContractKeys = next;
	}

	isContractExpanded(s: AdvisorCutSummaryWithState, contractUid: string): boolean {
		const key = this.contractBreakdownKey(s, contractUid);
		return this.expandedContractKeys.has(key);
	}

	commissionVersionLabel(p: CommissionPayment): string {
		switch (p.paymentType) {
			case 'IMMEDIATE':
				return 'Nueva';
			case 'RECURRING':
				return 'Anterior';
			case 'FINAL':
				return 'Final';
			case 'ADJUSTMENT':
				return 'Ajuste';
			default:
				return this.paymentTypeLabel(p.paymentType);
		}
	}

	commissionVersionColor(p: CommissionPayment): 'primary' | 'success' | 'warning' | 'medium' | 'danger' {
		switch (p.paymentType) {
			case 'IMMEDIATE':
				return 'success';
			case 'RECURRING':
				return 'medium';
			case 'FINAL':
				return 'primary';
			case 'ADJUSTMENT':
				return 'warning';
			default:
				return 'medium';
		}
	}

	roleLabel(role: string): string {
		if (!role) return '—';
		return this.ROLE_LABELS[role] ?? this.ROLE_LABELS[role.toUpperCase()] ?? role;
	}

	commissionReasonLabel(p: CommissionPayment): string {
		if (p.paymentType === 'ADJUSTMENT' && p.adjustmentReason) return p.adjustmentReason;
		if (p.scheme && p.scheme !== '—') return this.schemeLabel(p.scheme);
		return this.paymentTypeLabel(p.paymentType);
	}

	loadStates(startCutDate: number, endCutDate: number) {
		this.stateService.getByCutDateRange(startCutDate, endCutDate).then((states) => {
			this.stateStates$.next(states);
		});
	}

	/** Recarga estados y opcionalmente pagos del rango por defecto */
	private refreshCutData(reloadPayments = false) {
		const { startCutDate, endCutDate } = getDefaultCutDateRange();
		if (reloadPayments) {
			this.commissionPaymentFacade.loadCommissionPaymentsForCuts(startCutDate, endCutDate);
		}
		this.loadStates(startCutDate, endCutDate);
	}

	isBreakdownOverdue(cutDate: number): boolean {
		return this.getMexicoDateKey(Date.now()) > this.getMexicoDateKey(cutDate);
	}

	setFilterCut(cutDate: number | null) {
		this.filterCutDate$.next(cutDate);
	}

	setFilterAdvisor(advisorUid: string | null) {
		this.filterAdvisorUid$.next(advisorUid);
	}

	setViewMode(mode: 'all' | 'noncompliance') {
		this.viewMode$.next(mode);
	}

	stateLabel(state: string): string {
		return this.STATE_LABELS[state] ?? state;
	}

	paymentTypeLabel(type: string): string {
		return this.PAYMENT_TYPE_LABELS[type] ?? type;
	}

	/** UI corta: inmediata → Nueva, recurrente → Antigua */
	paymentTypeUiLabel(type: string): string {
		const t = (type ?? '').toUpperCase();
		switch (t) {
			case 'IMMEDIATE':
				return 'Nueva';
			case 'RECURRING':
				return 'Antigua';
			case 'FINAL':
				return 'Final';
			case 'ADJUSTMENT':
				return 'Ajuste';
			default:
				return this.paymentTypeLabel(type);
		}
	}

	schemeLabel(scheme: string): string {
		if (!scheme || scheme === '—') return '—';
		const s = scheme.toUpperCase();
		if (s.includes('NEW') || s.includes('NUEV')) return 'Nueva';
		if (s.includes('OLD') || s.includes('VIEJ')) return 'Anterior';
		return scheme;
	}

	/** Texto del plazo vigente según estado */
	getPlazoLabel(s: AdvisorCutSummaryWithState): string {
		const state = s.state?.state ?? 'PENDING';
		if (state === 'PENDING') return `Desglose: hasta ${new Date(s.cutDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		if (state === 'BREAKDOWN_SENT' && s.invoiceDeadline) return `Factura: hasta ${new Date(s.invoiceDeadline).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		if (state === 'SENT_TO_PAYMENT' && s.paymentDeadline) return `Pago: hasta ${new Date(s.paymentDeadline).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		if (state === 'PAID') return '—';
		return '—';
	}

	markBreakdownSent(advisorUid: string, cutDate: number) {
		this.stateService.markBreakdownSent(cutDate, advisorUid).then(() => this.refreshCutData());
	}

	async markInvoiceSent(advisorUid: string, cutDate: number, file?: File) {
		const invoiceUrl = file ? await this.attachmentService.uploadAttachment(cutDate, advisorUid, 'invoice', file) : undefined;
		const state = await this.stateService.markInvoiceSent(cutDate, advisorUid, invoiceUrl);
		const invoiceDeadline = state.breakdownSentAt ? getInvoiceDeadline(state.breakdownSentAt) : 0;
		const invoiceWasLate = !!(state.invoiceSentAt && isInvoiceLate(state.invoiceSentAt, invoiceDeadline));
		if (invoiceWasLate) {
			const nextCutDate = getNextCutDate(cutDate);
			await this.paymentFirestore.movePaymentsToNextCut(cutDate, advisorUid, nextCutDate);
			await this.stateService.moveStateToNextCut(cutDate, advisorUid);
		}
		this.refreshCutData(invoiceWasLate);
	}

	async markPaid(advisorUid: string, cutDate: number, file?: File) {
		const receiptUrl = file ? await this.attachmentService.uploadAttachment(cutDate, advisorUid, 'receipt', file) : undefined;
		await this.stateService.markPaid(cutDate, advisorUid, receiptUrl);
		this.commissionPaymentFacade.markPaidByCutDateAndAdvisor(cutDate, advisorUid, Date.now());
		this.refreshCutData();
	}

	markAdvisorCutAsPaid(advisorUid: string, cutDate: number) {
		this.markPaid(advisorUid, cutDate);
	}

	onInvoiceFileSelected(event: Event, advisorUid: string, cutDate: number) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.markInvoiceSent(advisorUid, cutDate, file);
		}
		input.value = '';
	}

	onReceiptFileSelected(event: Event, advisorUid: string, cutDate: number) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			this.markPaid(advisorUid, cutDate, file);
		}
		input.value = '';
	}

	exportPdfGeneral(summaries?: AdvisorCutSummaryWithState[], cutDateLabel?: string) {
		if (summaries?.length) {
			this.pdfService.exportGeneral(summaries, cutDateLabel);
		} else {
			combineLatest([this.advisorSummariesWithState$, this.cutDateLabel$])
				.pipe(take(1), map(([s, label]) => ({ summaries: s, label })))
				.subscribe(({ summaries, label }) => {
					if (summaries.length) this.pdfService.exportGeneral(summaries, label);
				});
		}
	}

	getSummariesForAdvisor(advisorUid: string, summaries: AdvisorCutSummaryWithState[]): AdvisorCutSummaryWithState[] {
		return summaries.filter((x) => x.advisorUid === advisorUid);
	}

	exportPdfByAdvisor(advisorName: string, summaries: AdvisorCutSummaryWithState[]) {
		const totalAmount = summaries.reduce((a, s) => a + s.totalAmount, 0);
		const pendingAmount = summaries.reduce((a, s) => a + s.pendingAmount, 0);
		const paidAmount = summaries.reduce((a, s) => a + s.paidAmount, 0);
		this.pdfService.exportByAdvisor(advisorName, summaries, totalAmount, pendingAmount, paidAmount);
	}
}
