import { Component, OnInit } from '@angular/core';
import { combineLatest, map, BehaviorSubject, take } from 'rxjs';

import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { CommissionPaymentFacade } from 'src/app/store/commission-payment/commission-payment.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';

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
	loading$ = this.commissionPaymentFacade.loading$;

	filterCutDate$ = new BehaviorSubject<number | null>(null);
	filterAdvisorUid$ = new BehaviorSubject<string | null>(null);
	viewMode$ = new BehaviorSubject<'all' | 'noncompliance'>('all');

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
		this.stateStates$,
		this.viewMode$,
	]).pipe(
		map(([summaries, states, viewMode]) => {
			const stateMap = new Map<string, CommissionCutAdvisorState>();
			states.forEach((s) => stateMap.set(`${s.cutDate}::${s.advisorUid}`, s));

			let result: AdvisorCutSummaryWithState[] = summaries.map((s) => {
				const state = stateMap.get(`${s.cutDate}::${s.advisorUid}`) ?? null;
				const invoiceDeadline = state?.breakdownSentAt ? getInvoiceDeadline(state.breakdownSentAt) : undefined;
				const paymentDeadline = state?.invoiceSentAt ? getPaymentDeadline(state.invoiceSentAt) : undefined;
				const invOverdue = invoiceDeadline ? isInvoiceOverdue(state?.invoiceSentAt, invoiceDeadline) : false;
				const payOverdue = paymentDeadline ? isPaymentOverdue(state?.receiptSentAt, paymentDeadline) : false;
				const isOverdue =
					(s.pendingAmount > 0 && invOverdue) ||
					(s.pendingAmount > 0 && payOverdue) ||
					(s.pendingAmount > 0 && !state?.breakdownSentAt && this.isBreakdownOverdue(s.cutDate));

				return {
					...s,
					state,
					invoiceDeadline,
					paymentDeadline,
					isOverdue,
				};
			});

			if (viewMode === 'noncompliance') {
				result = result.filter((r) => r.isOverdue || (r.pendingAmount > 0 && r.state?.state !== 'PAID'));
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

	constructor(
		private commissionPaymentFacade: CommissionPaymentFacade,
		private advisorFacade: AdvisorFacade,
		private stateService: CommissionCutStateFirestoreService,
		private attachmentService: CommissionCutAttachmentService,
		private pdfService: CommissionCutsPdfService,
		private paymentFirestore: CommissionPaymentFirestoreService
	) {}

	ngOnInit() {
		this.advisorFacade.loadAdvisors();
		const { startCutDate, endCutDate } = getDefaultCutDateRange();
		this.commissionPaymentFacade.loadCommissionPaymentsForCuts(startCutDate, endCutDate);
		this.loadStates(startCutDate, endCutDate);
	}

	loadStates(startCutDate: number, endCutDate: number) {
		this.stateService.getByCutDateRange(startCutDate, endCutDate).then((states) => {
			this.stateStates$.next(states);
		});
	}

	isBreakdownOverdue(cutDate: number): boolean {
		const d = new Date(cutDate);
		return Date.now() > d.getTime();
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

	schemeLabel(scheme: string): string {
		if (!scheme || scheme === '—') return '—';
		const s = scheme.toUpperCase();
		if (s.includes('NEW') || s.includes('NUEV')) return 'Nueva';
		if (s.includes('OLD') || s.includes('VIEJ')) return 'Vieja';
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
		this.stateService.markBreakdownSent(cutDate, advisorUid).then(() => {
			const { startCutDate, endCutDate } = getDefaultCutDateRange();
			this.loadStates(startCutDate, endCutDate);
		});
	}

	async markInvoiceSent(advisorUid: string, cutDate: number, file?: File) {
		let invoiceUrl: string | undefined;
		if (file) {
			invoiceUrl = await this.attachmentService.uploadAttachment(cutDate, advisorUid, 'invoice', file);
		}
		const state = await this.stateService.markInvoiceSent(cutDate, advisorUid, invoiceUrl);
		const invoiceDeadline = state.breakdownSentAt ? getInvoiceDeadline(state.breakdownSentAt) : 0;
		// Regla factura tardía: si factura se envió después del plazo, mover comisión al siguiente corte
		if (state.invoiceSentAt && isInvoiceLate(state.invoiceSentAt, invoiceDeadline)) {
			const nextCutDate = getNextCutDate(cutDate);
			await this.paymentFirestore.movePaymentsToNextCut(cutDate, advisorUid, nextCutDate);
			await this.stateService.moveStateToNextCut(cutDate, advisorUid);
			const range = getDefaultCutDateRange();
			this.commissionPaymentFacade.loadCommissionPaymentsForCuts(range.startCutDate, range.endCutDate);
		}
		const { startCutDate, endCutDate } = getDefaultCutDateRange();
		this.loadStates(startCutDate, endCutDate);
	}

	async markPaid(advisorUid: string, cutDate: number, file?: File) {
		let receiptUrl: string | undefined;
		if (file) {
			receiptUrl = await this.attachmentService.uploadAttachment(cutDate, advisorUid, 'receipt', file);
		}
		await this.stateService.markPaid(cutDate, advisorUid, receiptUrl);
		this.commissionPaymentFacade.markPaidByCutDateAndAdvisor(cutDate, advisorUid, Date.now());
		const { startCutDate, endCutDate } = getDefaultCutDateRange();
		this.loadStates(startCutDate, endCutDate);
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
