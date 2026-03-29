import { Component, DestroyRef, ElementRef, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, map, BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { CommissionPaymentFacade } from 'src/app/store/commission-payment/commission-payment.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import { Contract } from 'src/app/store/contract/contract.model';
import { ContractFacade } from 'src/app/store/contract/contract.facade';

import { AdvisorCutSummary } from 'src/app/models/commission-cuts-summary.model';
import { CommissionCutAdvisorState } from 'src/app/models/commission-cut-state.model';
import {
	type LateReasonEntry,
	type LateReasonStep,
	getLateReasonLabel,
	normalizeLateReasons,
} from 'src/app/models/commission-cut-late-reason.model';
import { LateReasonModalComponent } from 'src/app/components/late-reason-modal/late-reason-modal.component';
import { ProcessDeferredModalComponent, type ProcessDeferredResult } from 'src/app/components/process-deferred-modal/process-deferred-modal.component';
import { CommissionCutAttachmentService } from 'src/app/services/commission-cut-attachment.service';
import { CommissionCutsPdfService } from 'src/app/services/commission-cuts-pdf.service';
import {
	addBusinessDays,
	classifyDeferralPaymentCase,
	getBreakdownDeadline,
	computeDeferralDisplayIndexFromPayments,
	getEffectiveDeferredDisplayCut,
	getInvoiceDeadline,
	getLastCutDateOnOrBefore,
	getMinValidTargetCut,
	getNextCutDate,
	getPaymentDeadline,
	isInvoiceLate,
	isInvoiceOverdue,
	isPaymentOverdue,
	paymentFlowHasAnyLateStep,
	sameCanonicalCutDate,
} from 'src/app/domain/commission-cut/commission-cut-deadlines.util';
import {
	commissionPaymentToSyntheticAdvisorState,
	deriveAdvisorWorkflowFromPayments,
	paymentWorkflowStateAtCut,
	type DerivedAdvisorWorkflow,
} from 'src/app/domain/commission-cut/commission-payment-workflow.util';
import {
	isAfterMexicoDate,
	toCanonicalMexicoDateTimestamp,
	toMexicoDateInputValue,
} from 'src/app/domain/time/mexico-time.util';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';
import { ActionSheetController, AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';

export type AdvisorCutSummaryWithState = AdvisorCutSummary & {
	state: CommissionCutAdvisorState | null;
	/** Agregado de líneas en la tarjeta (incluye MIXED). */
	advisorWorkflowDerived?: DerivedAdvisorWorkflow;
	/** Estado del flujo en el corte **original** de cada línea (uid de pago → estado). */
	paymentDeferralStates?: Map<string, CommissionCutAdvisorState | null>;
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

/** Resúmenes agrupados por fecha de corte (para UI). */
export type CutSummariesGroup = {
	cutDate: number;
	items: AdvisorCutSummaryWithState[];
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
	viewMode$ = new BehaviorSubject<'all' | 'noncompliance' | 'paidLate'>('all');

	@ViewChild('cutSelect', { read: ElementRef }) private cutSelectRef?: ElementRef;
	@ViewChild('advisorSelect', { read: ElementRef }) private advisorSelectRef?: ElementRef;

	/** Snapshot síncrono para getAdvisorStateForCut (mismo orden que el store). */
	private latestPaymentsSnapshot: CommissionPayment[] = [];

	/** Pagos + índice de diferidas (estado solo en `CommissionPayment`). */
	private readonly cutsDeferralIndex$ = this.commissionPayments$.pipe(
		map((payments) => {
			const { horizon, effectiveByUid } = computeDeferralDisplayIndexFromPayments(payments);
			return { payments, horizon, effectiveByUid };
		}),
		shareReplay({ bufferSize: 1, refCount: true }),
	);

	cutDates$ = this.cutsDeferralIndex$.pipe(
		map(({ payments, horizon, effectiveByUid }) => {
			const set = new Set<number>();
			for (const p of payments) {
				if (p.cutDate) set.add(p.cutDate);
				if (p.deferredToCutDate) set.add(p.deferredToCutDate);
			}
			for (const eff of effectiveByUid.values()) {
				if (eff != null && eff <= horizon) set.add(eff);
			}
			return Array.from(set).sort((a, b) => a - b);
		}),
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
		this.cutsDeferralIndex$,
		this.advisors$,
		this.filterCutDate$,
		this.filterAdvisorUid$,
	]).pipe(
		map(([idx, advisorsDic, filterCut, filterAdvisor]) => {
			const { payments, horizon, effectiveByUid } = idx;
			const byCutAdvisor = new Map<string, AdvisorCutSummary>();

			const addToBucket = (p: CommissionPayment, effectiveCutDate: number) => {
				if (filterCut != null && effectiveCutDate !== filterCut) return;
				if (filterAdvisor != null && p.advisorUid !== filterAdvisor) return;

				const key = `${effectiveCutDate}::${p.advisorUid}`;
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
						cutDate: effectiveCutDate,
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
			};

			for (const p of payments) {
				if (p.cancelled) continue;
				addToBucket(p, p.cutDate);
				const eff = effectiveByUid.get(p.uid) ?? null;
				if (eff != null && eff <= horizon) addToBucket(p, eff);
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
	advisorSummariesWithState$ = combineLatest([this.advisorSummaries$, this.contracts$, this.viewMode$]).pipe(
		map(([summaries, contracts, viewMode]) => {
			const contractMap = new Map<string, Contract>();
			contracts.forEach((c) => contractMap.set(c.uid, c));

			let result: AdvisorCutSummaryWithState[] = summaries.map((s) => {
				const { derived, mergedState } = deriveAdvisorWorkflowFromPayments(s.payments, s.cutDate);
				const state = mergedState;
				const invoiceDeadline = state?.breakdownSentAt
					? getInvoiceDeadline(state.breakdownSentAt)
					: getBreakdownDeadline(s.cutDate);
				const paymentDeadline = state?.invoiceSentAt ? getPaymentDeadline(state.invoiceSentAt) : undefined;
				const invOverdue = invoiceDeadline ? isInvoiceOverdue(state?.invoiceSentAt, invoiceDeadline) : false;
				const payOverdue = paymentDeadline ? isPaymentOverdue(state?.receiptSentAt, paymentDeadline) : false;
				const hasLateReasons = normalizeLateReasons(state?.lateReasons).length > 0;
				const isDeferred = !!(state?.movedToNextCut || state?.originalCutDate);
				const isOverdue =
					(s.pendingAmount > 0 && (invOverdue || payOverdue)) ||
					(s.pendingAmount > 0 && hasLateReasons) ||
					(s.pendingAmount > 0 && isDeferred);

				const paymentDeferralStates = new Map<string, CommissionCutAdvisorState | null>();
				for (const p of s.payments) {
					paymentDeferralStates.set(p.uid, paymentWorkflowStateAtCut(p, s.cutDate));
				}

				return {
					...s,
					state,
					advisorWorkflowDerived: derived,
					paymentDeferralStates,
					invoiceDeadline,
					paymentDeadline,
					isOverdue,
					contractBreakdown: this.groupPaymentsByContract(s.payments, contractMap),
				};
			});

			if (viewMode === 'noncompliance') {
				result = result.filter((r) => r.isOverdue);
			} else if (viewMode === 'paidLate') {
				result = result.filter((r) => this.summaryHasAnyPaidLateStrip(r));
			}

			return result;
		})
	);

	nonComplianceCount$ = this.advisorSummariesWithState$.pipe(
		map((summaries) => summaries.filter((s) => s.isOverdue).length)
	);

	paidLateCount$ = this.advisorSummariesWithState$.pipe(
		map((summaries) => summaries.filter((s) => this.summaryHasAnyPaidLateStrip(s)).length)
	);

	/** Misma data que `advisorSummariesWithState$`, ordenada por corte y agrupada para separadores en UI. */
	summariesGroupedByCut$ = this.advisorSummariesWithState$.pipe(
		map((summaries) => this.groupSummariesByCutDate(summaries))
	);

	cutDateLabel$ = this.filterCutDate$.pipe(
		map((cd) => (cd ? new Date(cd).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined))
	);

	readonly STATE_LABELS: Record<string, string> = {
		PENDING: 'Pendiente',
		BREAKDOWN_SENT: 'Desglose descargado',
		SENT_TO_PAYMENT: 'Enviada a pago',
		PAID: 'Pagada',
		MIXED: 'En proceso (varias líneas)',
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

	private static readonly LATE_STEP_ORDER: Record<LateReasonStep, number> = {
		DESGLOSE: 0,
		FACTURA: 1,
		PAGO: 2,
	};

	/** UIDs de comisiones diferidas seleccionadas para procesar (Path 2). */
	selectedDeferredIds = new Set<string>();

	/** Tras elegir fecha, abre el input de archivo oculto. */
	private pendingFileAttach: {
		kind: 'invoice' | 'receipt';
		advisorUid: string;
		stateCutDate: number;
		summaryCutDate: number;
		at: number;
		lateEntry?: LateReasonEntry;
		s: AdvisorCutSummaryWithState;
	} | null = null;

	constructor(
		private destroyRef: DestroyRef,
		private commissionPaymentFacade: CommissionPaymentFacade,
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private attachmentService: CommissionCutAttachmentService,
		private pdfService: CommissionCutsPdfService,
		private paymentFirestore: CommissionPaymentFirestoreService,
		private modalCtrl: ModalController,
		private actionSheetCtrl: ActionSheetController,
		private alertCtrl: AlertController,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) {
		this.commissionPayments$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
			this.latestPaymentsSnapshot = p ?? [];
		});
	}

	/** Loading bloqueante mientras sube a Storage y guarda estado (evita doble clic). */
	private async withUploadLoading<T>(message: string, fn: () => Promise<T>): Promise<T> {
		const loading = await this.loadingCtrl.create({
			message,
			backdropDismiss: false,
		});
		await loading.present();
		try {
			return await fn();
		} finally {
			await loading.dismiss();
		}
	}

	private openIonSelect(selectRef?: ElementRef) {
		const el = selectRef?.nativeElement as any;
		if (!el) return;

		// Ionic's web component usually exposes `open()`; fallback to click for safety.
		if (typeof el.open === 'function') el.open();
		else if (typeof el.click === 'function') el.click();
	}

	openCutSelect() {
		this.openIonSelect(this.cutSelectRef);
	}

	openAdvisorSelect() {
		this.openIonSelect(this.advisorSelectRef);
	}

	ngOnInit() {
		this.ensureContractsLoadedIfEmpty();
	}

	/**
	 * Reconcilia `deferredToCutDate` en pagos al entrar (idempotente).
	 */
	ionViewWillEnter() {
		void this.enterCommissionCuts();
	}

	/** Contratos solo si el store está vacío (p. ej. acceso directo sin pasar por login completo). */
	private ensureContractsLoadedIfEmpty() {
		this.contractFacade.total$.pipe(take(1)).subscribe((n) => {
			if (n === 0) this.contractFacade.loadContracts();
		});
	}

	/** Orden fijo del flujo: desglose → factura → pago. */
	private sortLateReasonEntriesByFlowOrder(entries: LateReasonEntry[]): LateReasonEntry[] {
		return [...entries].sort(
			(a, b) =>
				(CommissionCutsPage.LATE_STEP_ORDER[a.step] ?? 99) - (CommissionCutsPage.LATE_STEP_ORDER[b.step] ?? 99),
		);
	}

	/**
	 * Motivos que el sistema registra / muestra cuando ya venció el plazo y no hay avance en ese paso
	 * (sin texto: solo catálogo). Orden: desglose, factura, pago.
	 */
	private computeAutoLateReasonEntries(
		state: CommissionCutAdvisorState | null,
		cutDate: number,
	): LateReasonEntry[] {
		const st = state;
		const entries: LateReasonEntry[] = [];
		const breakdownDl = getBreakdownDeadline(cutDate);

		const pendingOrMissing = st?.state === 'PENDING' || !st;
		if (pendingOrMissing && !st?.breakdownSentAt && isInvoiceOverdue(undefined, breakdownDl)) {
			entries.push({ step: 'DESGLOSE', reason: 'DESGLOSE_NO_ENVIADO_A_TIEMPO' });
		}

		if (st?.breakdownSentAt && !st.invoiceSentAt) {
			const invDl = getInvoiceDeadline(st.breakdownSentAt);
			if (isInvoiceOverdue(undefined, invDl)) {
				entries.push({ step: 'FACTURA', reason: 'FACTURA_NO_RECIBIDA_A_TIEMPO' });
			}
		}

		if (st?.invoiceSentAt && st.state !== 'PAID' && !st.receiptSentAt) {
			const payDl = getPaymentDeadline(st.invoiceSentAt);
			if (isPaymentOverdue(undefined, payDl)) {
				entries.push({ step: 'PAGO', reason: 'PAGO_NO_REALIZADO_A_TIEMPO' });
			}
		}

		return entries;
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

	/** Corte destino actual de la diferida (encadenada mes a mes según plazos). */
	private effectiveDeferredCut(p: CommissionPayment): number | null {
		return getEffectiveDeferredDisplayCut(p, p.advisorUid, (cd) => paymentWorkflowStateAtCut(p, cd));
	}

	/**
	 * Esta fila es el **segundo** corte (arrastre desde el original). Solo entonces se muestra “Corte orig.”.
	 */
	paymentRolledIntoSummaryCut(pay: CommissionPayment, summaryCutDate: number): boolean {
		if (pay.cancelled || pay.paid || pay.paidAt) return false;
		if (summaryCutDate <= pay.cutDate) return false;
		const second = this.effectiveDeferredCut(pay);
		return second != null && summaryCutDate === second;
	}

	/** Origen “Diferida”: arrastre al siguiente corte, o en corte original si aplica segundo corte / motivo de fondeo. */
	paymentShowsDeferredOriginInSummary(pay: CommissionPayment, summaryCutDate: number): boolean {
		if (this.paymentRolledIntoSummaryCut(pay, summaryCutDate)) return true;
		if (pay.cancelled || pay.paid || pay.paidAt) return false;
		if (summaryCutDate !== pay.cutDate) return false;
		if (pay.fundingDeferralReasonCode) return true;
		return this.effectiveDeferredCut(pay) != null;
	}

	/** Pagos diferidos explícitos (Path 2 / checkbox): solo con deferredToCutDate en Firestore. */
	getDeferredUnpaidPayments(s: AdvisorCutSummaryWithState): CommissionPayment[] {
		return s.payments.filter(
			(p) => p.deferredToCutDate === s.cutDate && !p.paid && !p.paidAt && !p.cancelled
		);
	}

	/** Selecciones que pertenecen a este resumen. */
	getSelectedDeferredForSummary(s: AdvisorCutSummaryWithState): CommissionPayment[] {
		const deferred = this.getDeferredUnpaidPayments(s);
		return deferred.filter((p) => this.selectedDeferredIds.has(p.uid));
	}

	hasDeferredUnpaid(s: AdvisorCutSummaryWithState): boolean {
		return this.getDeferredUnpaidPayments(s).length > 0;
	}

	toggleDeferredSelection(pay: CommissionPayment, s: AdvisorCutSummaryWithState) {
		if (pay.deferredToCutDate !== s.cutDate || pay.paid || pay.paidAt) return;
		if (this.selectedDeferredIds.has(pay.uid)) {
			this.selectedDeferredIds.delete(pay.uid);
		} else {
			this.selectedDeferredIds.add(pay.uid);
		}
		this.selectedDeferredIds = new Set(this.selectedDeferredIds);
	}

	isDeferredSelected(pay: CommissionPayment): boolean {
		return this.selectedDeferredIds.has(pay.uid);
	}

	async processSelectedDeferred(s: AdvisorCutSummaryWithState) {
		const selected = this.getSelectedDeferredForSummary(s);
		if (selected.length === 0) return;
		const totalAmount = selected.reduce((a, p) => a + (p.amount ?? 0), 0);
		const deferredCutDate = s.cutDate; // corte donde están diferidas
		const originalCutDate = selected[0].cutDate;

		const modal = await this.modalCtrl.create({
			component: ProcessDeferredModalComponent,
			componentProps: {
				count: selected.length,
				totalAmount,
				deferredCutDate,
			},
		});
		await modal.present();
		const { data, role } = await modal.onWillDismiss<ProcessDeferredResult>();
		if (role !== 'ok' || !data) return;

		const { breakdownSentAt, invoiceSentAt, receiptSentAt } = data;

		// ¿Desglose antes del corte diferido? → mover al corte ≤ desglose (por grupo se calcula tgt)
		// ¿Alguna fecha superó el plazo? → naranja (paidLate)
		const breakdownDeadline = addBusinessDays(originalCutDate, 2);
		const invoiceDeadline = addBusinessDays(breakdownSentAt, 2);
		const paymentDeadline = addBusinessDays(invoiceSentAt, 2);
		const wasBreakdownLate = isAfterMexicoDate(breakdownSentAt, breakdownDeadline);
		const wasInvoiceLate = isAfterMexicoDate(invoiceSentAt, invoiceDeadline);
		const wasPaymentLate = isAfterMexicoDate(receiptSentAt, paymentDeadline);
		const paidLate = wasBreakdownLate || wasInvoiceLate || wasPaymentLate;

		const cutForUploads = deferredCutDate;
		const invoiceUrl = await this.attachmentService.uploadAttachment(
			cutForUploads,
			s.advisorUid,
			'invoice',
			data.invoiceFile
		);
		const receiptUrl = await this.attachmentService.uploadAttachment(
			cutForUploads,
			s.advisorUid,
			'receipt',
			data.receiptFile
		);

		const pagoLateEntry: LateReasonEntry = {
			step: 'PAGO',
			reason: data.reason,
			text: data.text,
			at: receiptSentAt,
		};

		const byOriginalCut = new Map<number, CommissionPayment[]>();
		for (const p of selected) {
			const orig = p.cutDate;
			if (!byOriginalCut.has(orig)) byOriginalCut.set(orig, []);
			byOriginalCut.get(orig)!.push(p);
		}

		const groups: Array<{ uids: string[]; targetCutDate: number; originalCutDate: number }> = [];
		for (const [origCut, payments] of byOriginalCut) {
			const uids = payments.map((p) => p.uid);
			let tgt: number;
			if (breakdownSentAt < deferredCutDate) {
				const candidate = getLastCutDateOnOrBefore(breakdownSentAt);
				const minValid = getMinValidTargetCut(origCut, deferredCutDate);
				tgt = candidate >= minValid ? candidate : minValid;
			} else {
				tgt = deferredCutDate;
			}
			groups.push({ uids, targetCutDate: tgt, originalCutDate: origCut });
		}

		await this.paymentFirestore.completeDeferredPath2OnPaymentGroups(groups, {
			breakdownSentAt,
			invoiceSentAt,
			invoiceUrl: invoiceUrl!,
			receiptSentAt,
			receiptUrl: receiptUrl!,
			paidLate,
			pagoLateEntry: paidLate ? pagoLateEntry : undefined,
		});

		const paymentUids = selected.map((p) => p.uid);
		this.selectedDeferredIds = new Set(
			Array.from(this.selectedDeferredIds).filter((id) => !paymentUids.includes(id))
		);
		this.refreshCutData(true);
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

	/** Reconciliar `deferredToCutDate` en pagos (idempotente). */
	private async enterCommissionCuts() {
		try {
			const payments = await firstValueFrom(this.commissionPayments$.pipe(take(1)));
			const updated = await this.paymentFirestore.reconcileDeferredToCutDates(payments);
			if (updated > 0) {
				this.commissionPaymentFacade.loadCommissionPaymentsForCuts();
			}
		} catch (err) {
			console.error(err);
			const t = await this.toastCtrl.create({
				message: 'No se pudo alinear el diferido en comisiones. Revisa conexión o reglas.',
				duration: 4000,
				color: 'warning',
			});
			await t.present();
		}
	}

	/** Recarga comisiones (histórico de cortes) cuando hubo escrituras en Firestore. */
	private refreshCutData(reloadPayments = false) {
		if (reloadPayments) {
			this.commissionPaymentFacade.loadCommissionPaymentsForCuts();
		}
	}

	/** Líneas con `deferredToCutDate` = corte del resumen (vista diferida). */
	private getDeferredPaymentsInSummary(s: AdvisorCutSummaryWithState): CommissionPayment[] {
		const out: CommissionPayment[] = [];
		for (const c of s.contractBreakdown) {
			for (const p of c.payments) {
				if (p.cancelled || p.paid || p.paidAt) continue;
				if (p.deferredToCutDate === s.cutDate) out.push(p);
			}
		}
		return out;
	}

	/**
	 * Factura: Caso 1/2 vs corte diferido. Sin diferidas en el resumen → `'use-legacy'`.
	 */
	private async applyDeferredCaseInvoiceFlow(
		s: AdvisorCutSummaryWithState,
		at: number,
		lateEntry: LateReasonEntry | undefined,
		invoiceUrl: string | undefined,
	): Promise<'use-legacy' | { invoiceWasLateAny: boolean }> {
		const deferredPays = this.getDeferredPaymentsInSummary(s);
		if (deferredPays.length === 0) return 'use-legacy';

		const defCut = s.cutDate;
		const caseKind = classifyDeferralPaymentCase(defCut, [at]) ?? 'ON_OR_AFTER_DEFERRED_CUT';
		const originals = [...new Set(deferredPays.map((p) => p.cutDate))];

		const runLateMoves = async (invoiceWasLateAny: boolean) => {
			if (!invoiceWasLateAny) return;
			for (const orig of originals) {
				const uidsAtOrig = await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(orig, s.advisorUid, true);
				await this.paymentFirestore.movePaymentsToNextCut(orig, s.advisorUid, getNextCutDate(orig));
				if (!lateEntry && uidsAtOrig.length) {
					await this.paymentFirestore.mergeLateReasonToPaymentUids(uidsAtOrig, {
						step: 'FACTURA',
						reason: 'FACTURA_NO_RECIBIDA_A_TIEMPO',
						at: Date.now(),
					});
				}
			}
		};

		const uidsForDeferredCut = (cd: number): string[] => {
			if (cd === defCut) return deferredPays.map((p) => p.uid);
			return deferredPays.filter((p) => p.cutDate === cd).map((p) => p.uid);
		};

		if (caseKind === 'BEFORE_DEFERRED_CUT') {
			await this.paymentFirestore.clearDeferredToCutDateForPaymentUids(deferredPays.map((p) => p.uid));
			let invoiceWasLateAny = false;
			for (const orig of originals) {
				const uids = uidsForDeferredCut(orig);
				if (!uids.length) continue;
				await this.paymentFirestore.applyInvoiceSentToPaymentUids(uids, {
					invoiceSentAt: at,
					invoiceUrl,
					lateEntry,
				});
				const refPay = deferredPays.find((p) => p.uid === uids[0])!;
				const syn = commissionPaymentToSyntheticAdvisorState(refPay);
				const invoiceDeadlineForCheck = syn.breakdownSentAt
					? getInvoiceDeadline(syn.breakdownSentAt)
					: getBreakdownDeadline(orig);
				if (isInvoiceLate(at, invoiceDeadlineForCheck)) invoiceWasLateAny = true;
			}
			await runLateMoves(invoiceWasLateAny);
			return { invoiceWasLateAny };
		}

		const cuts = [...new Set([...originals, defCut])];
		let invoiceWasLateAny = false;
		for (const cd of cuts) {
			const uids = uidsForDeferredCut(cd);
			if (!uids.length) continue;
			await this.paymentFirestore.applyInvoiceSentToPaymentUids(uids, {
				invoiceSentAt: at,
				invoiceUrl,
				lateEntry,
			});
			const refPay = deferredPays.find((p) => p.uid === uids[0])!;
			const syn = commissionPaymentToSyntheticAdvisorState(refPay);
			const invoiceDeadlineForCheck = syn.breakdownSentAt
				? getInvoiceDeadline(syn.breakdownSentAt)
				: getBreakdownDeadline(refPay.cutDate);
			if (isInvoiceLate(at, invoiceDeadlineForCheck)) invoiceWasLateAny = true;
		}
		await runLateMoves(invoiceWasLateAny);
		return { invoiceWasLateAny };
	}

	/** Pago: Caso 1/2 vs corte diferido. */
	private async applyDeferredCaseMarkPaidFlow(
		s: AdvisorCutSummaryWithState,
		at: number,
		lateEntry: LateReasonEntry | undefined,
		receiptUrl: string | undefined,
	): Promise<'use-legacy' | void> {
		const deferredPays = this.getDeferredPaymentsInSummary(s);
		if (deferredPays.length === 0) return 'use-legacy';

		const defCut = s.cutDate;
		const caseKind = classifyDeferralPaymentCase(defCut, [at]) ?? 'ON_OR_AFTER_DEFERRED_CUT';
		const originals = [...new Set(deferredPays.map((p) => p.cutDate))];

		const uidsForDeferredCut = (cd: number): string[] => {
			if (cd === defCut) return deferredPays.map((p) => p.uid);
			return deferredPays.filter((p) => p.cutDate === cd).map((p) => p.uid);
		};

		if (caseKind === 'BEFORE_DEFERRED_CUT') {
			await this.paymentFirestore.clearDeferredToCutDateForPaymentUids(deferredPays.map((p) => p.uid));
			for (const orig of originals) {
				const uids = uidsForDeferredCut(orig);
				if (!uids.length) continue;
				await this.paymentFirestore.applyPaidToPaymentUids(uids, {
					paidAt: at,
					receiptUrl,
					lateEntry,
				});
			}
			return;
		}

		const cuts = [...new Set([...originals, defCut])];
		for (const cd of cuts) {
			const uids = uidsForDeferredCut(cd);
			if (!uids.length) continue;
			await this.paymentFirestore.applyPaidToPaymentUids(uids, {
				paidAt: at,
				receiptUrl,
				lateEntry,
			});
		}
	}

	setFilterCut(cutDate: number | null) {
		this.filterCutDate$.next(cutDate);
	}

	setFilterAdvisor(advisorUid: string | null) {
		this.filterAdvisorUid$.next(advisorUid);
	}

	setViewMode(mode: 'all' | 'noncompliance' | 'paidLate') {
		this.viewMode$.next(mode);
	}

	/** true si el corte es diferido (vino del corte anterior por factura tardía). */
	isDeferred(s: AdvisorCutSummaryWithState): boolean {
		return !!(s.state?.movedToNextCut || s.state?.originalCutDate);
	}

	/** Corte donde está el estado (puede ser original cuando es diferida). */
	getStateCutDate(s: AdvisorCutSummaryWithState): number {
		const raw = s.state?.cutDate ?? s.cutDate;
		if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
		if (raw != null && typeof raw === 'object' && typeof (raw as { toMillis?: () => number }).toMillis === 'function') {
			return (raw as { toMillis: () => number }).toMillis();
		}
		return s.cutDate;
	}

	/** true cuando se muestra en corte original y está diferida (solo lectura). */
	isReadOnlyDeferred(s: AdvisorCutSummaryWithState): boolean {
		return !!(s.state?.deferredToCutDate && s.cutDate === s.state?.cutDate);
	}

	/** Motivos de atraso a nivel asesora+corte del resumen (cabecera; puede mezclar cortes — preferir por línea). */
	getEffectiveLateReasons(s: AdvisorCutSummaryWithState): LateReasonEntry[] {
		const normalized = normalizeLateReasons(s.state?.lateReasons);
		if (normalized.length) return this.sortLateReasonEntriesByFlowOrder(normalized);
		const cutForState = s.state?.cutDate ?? s.cutDate;
		return this.sortLateReasonEntriesByFlowOrder(this.computeAutoLateReasonEntries(s.state, cutForState));
	}

	/** Al menos una comisión pagada con franja “tarde” (cualquier paso fuera de plazo), o flag legacy en estado. */
	summaryHasAnyPaidLateStrip(s: AdvisorCutSummaryWithState): boolean {
		if (s.state?.paidLate) return true;
		for (const c of s.contractBreakdown) {
			for (const p of c.payments) {
				if (p.cancelled || (!p.paid && !p.paidAt)) continue;
				if (this.getPaymentStripStatus(s, p) === 'paidLate') return true;
			}
		}
		return false;
	}

	/** Estado agregado en el corte original de la asesora (varias líneas → mismo modelo que la tarjeta). */
	getAdvisorStateForCut(advisorUid: string, cutDate: number): CommissionCutAdvisorState | null {
		const relevant = this.latestPaymentsSnapshot.filter(
			(p) => p.advisorUid === advisorUid && !p.cancelled && sameCanonicalCutDate(p.cutDate, cutDate),
		);
		if (!relevant.length) return null;
		return deriveAdvisorWorkflowFromPayments(relevant, cutDate).mergedState;
	}

	/** Timestamps del flujo viven en el doc del pago. */
	private getFlowStateForPayment(_s: AdvisorCutSummaryWithState, pay: CommissionPayment): CommissionCutAdvisorState | null {
		return commissionPaymentToSyntheticAdvisorState(pay);
	}

	/** Motivos de atraso / desglose solo para esta línea. */
	getEffectiveLateReasonsForPayment(_s: AdvisorCutSummaryWithState, pay: CommissionPayment): LateReasonEntry[] {
		const st = commissionPaymentToSyntheticAdvisorState(pay);
		const normalized = normalizeLateReasons(st.lateReasons);
		if (normalized.length) return this.sortLateReasonEntriesByFlowOrder(normalized);
		return this.sortLateReasonEntriesByFlowOrder(this.computeAutoLateReasonEntries(st, pay.cutDate));
	}

	getLateReasonLabel(code: string): string {
		return getLateReasonLabel(code);
	}

	/** Motivos de atraso como string (solo línea; sin fondeo). */
	getLateReasonsLabelForPayment(s: AdvisorCutSummaryWithState, pay: CommissionPayment): string {
		return this.getEffectiveLateReasonsForPayment(s, pay)
			.map((e) => (e.text?.trim() ? `${getLateReasonLabel(e.reason)}: ${e.text.trim()}` : getLateReasonLabel(e.reason)))
			.join(', ');
	}

	/**
	 * Líneas para la caja de motivos: `Motivo: comentario` (o solo motivo si no hay texto).
	 * Unifica fondeo + lateReasons sin duplicar el mismo código de catálogo; varios textos se unen con "; ".
	 */
	getPaymentMotivoDisplayLines(s: AdvisorCutSummaryWithState, pay: CommissionPayment): string[] {
		const orderedReasons: string[] = [];
		const textsByReason = new Map<string, string[]>();

		const add = (reason: string | undefined, rawText: string | undefined) => {
			if (!reason) return;
			const t = (rawText ?? '').trim();
			if (!textsByReason.has(reason)) {
				textsByReason.set(reason, []);
				orderedReasons.push(reason);
			}
			if (t) {
				const arr = textsByReason.get(reason)!;
				if (!arr.includes(t)) arr.push(t);
			}
		};

		if (pay.fundingDeferralReasonCode) {
			add(pay.fundingDeferralReasonCode, pay.fundingDeferralReasonText);
		}
		for (const e of this.getEffectiveLateReasonsForPayment(s, pay)) {
			add(e.reason, e.text);
		}

		return orderedReasons.map((reason) => {
			const label = getLateReasonLabel(reason);
			const texts = textsByReason.get(reason) ?? [];
			const comment = texts.join('; ');
			return comment ? `${label}: ${comment}` : label;
		});
	}

	/**
	 * Franja por comisión: pagada a tiempo = verde; pagada con algún paso tarde = naranja;
	 * pendiente en plazo = amarillo; atraso activo = rojo.
	 */
	getPaymentStripStatus(
		s: AdvisorCutSummaryWithState,
		pay: CommissionPayment
	): 'paid' | 'paidLate' | 'overdue' | 'pending' {
		if (pay.cancelled) return 'pending';
		if (pay.paid || pay.paidAt) {
			const flowSt = this.getFlowStateForPayment(s, pay);
			return paymentFlowHasAnyLateStep(pay.cutDate, flowSt) ? 'paidLate' : 'paid';
		}
		const st = commissionPaymentToSyntheticAdvisorState(pay);
		const invoiceDeadline = st?.breakdownSentAt
			? getInvoiceDeadline(st.breakdownSentAt)
			: getBreakdownDeadline(pay.cutDate);
		const paymentDeadline = st?.invoiceSentAt ? getPaymentDeadline(st.invoiceSentAt) : undefined;
		const invOverdue = invoiceDeadline ? isInvoiceOverdue(st?.invoiceSentAt, invoiceDeadline) : false;
		const payOverdue = paymentDeadline ? isPaymentOverdue(st?.receiptSentAt, paymentDeadline) : false;
		const hasLate = normalizeLateReasons(st?.lateReasons).length > 0;
		const desgloseOverdueSinEnviar =
			(st?.state === 'PENDING' || !st) &&
			!!invoiceDeadline &&
			isInvoiceOverdue(undefined, invoiceDeadline);
		if (invOverdue || payOverdue || hasLate || desgloseOverdueSinEnviar) return 'overdue';
		return 'pending';
	}

	/** Borde de tarjeta asesora: rojo > amarillo/naranja > verde (según peor comisión). */
	getSummaryCardBorderSeverity(s: AdvisorCutSummaryWithState): 'danger' | 'warning' | 'success' | 'neutral' {
		let anyOverdue = false;
		let anyPendingUnpaid = false;
		let anyPaidLate = false;
		let anyPaidOnTime = false;
		for (const c of s.contractBreakdown) {
			for (const pay of c.payments) {
				if (pay.cancelled) continue;
				const strip = this.getPaymentStripStatus(s, pay);
				if (strip === 'overdue') anyOverdue = true;
				else if (strip === 'pending') anyPendingUnpaid = true;
				else if (strip === 'paidLate') anyPaidLate = true;
				else anyPaidOnTime = true;
			}
		}
		if (anyOverdue) return 'danger';
		if (anyPendingUnpaid || anyPaidLate) return 'warning';
		if (anyPaidOnTime && !anyPendingUnpaid) return 'success';
		return 'neutral';
	}

	/** Borde del bloque contrato (misma prioridad, solo pagos de ese contrato). */
	getContractGroupBorderSeverity(
		s: AdvisorCutSummaryWithState,
		c: AdvisorCutSummaryWithState['contractBreakdown'][0]
	): 'danger' | 'warning' | 'success' | 'neutral' {
		let anyOverdue = false;
		let anyPendingUnpaid = false;
		let anyPaidLate = false;
		let anyPaidOnTime = false;
		for (const pay of c.payments) {
			if (pay.cancelled) continue;
			const strip = this.getPaymentStripStatus(s, pay);
			if (strip === 'overdue') anyOverdue = true;
			else if (strip === 'pending') anyPendingUnpaid = true;
			else if (strip === 'paidLate') anyPaidLate = true;
			else anyPaidOnTime = true;
		}
		if (anyOverdue) return 'danger';
		if (anyPendingUnpaid || anyPaidLate) return 'warning';
		if (anyPaidOnTime && !anyPendingUnpaid) return 'success';
		return 'neutral';
	}

	/** Motivos de atraso como string unido por comas (resumen; legacy). */
	getLateReasonsLabel(s: AdvisorCutSummaryWithState): string {
		return this.getEffectiveLateReasons(s)
			.map((e) => (e.text ? `${getLateReasonLabel(e.reason)}: ${e.text}` : getLateReasonLabel(e.reason)))
			.join(', ');
	}

	stateLabel(state: string): string {
		return this.STATE_LABELS[state] ?? state;
	}

	/** Badge y `@switch` de acciones: expone `MIXED` aunque `mergedState.state` sea el “peor” paso. */
	cardWorkflowUiKey(s: AdvisorCutSummaryWithState): string {
		return s.advisorWorkflowDerived === 'MIXED' ? 'MIXED' : (s.state?.state ?? 'PENDING');
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
		const state = s.advisorWorkflowDerived ?? s.state?.state ?? 'PENDING';
		if (state === 'MIXED') {
			return 'Varias líneas en distinto paso; revisa el detalle por comisión.';
		}
		if (state === 'PENDING') {
			const deadline = getBreakdownDeadline(s.cutDate);
			return `Informe / desglose: hasta ${new Date(deadline).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		}
		if (state === 'BREAKDOWN_SENT' && s.invoiceDeadline) return `Factura: hasta ${new Date(s.invoiceDeadline).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		if (state === 'SENT_TO_PAYMENT' && s.paymentDeadline) return `Pago: hasta ${new Date(s.paymentDeadline).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		if (state === 'PAID') return '—';
		return '—';
	}

	private async promptStepActionDate(message: string): Promise<number | undefined> {
		const defaultDay = toMexicoDateInputValue(Date.now()) ?? '';
		return new Promise((resolve) => {
			void this.alertCtrl
				.create({
					header: 'Fecha de la acción',
					message,
					inputs: [
						{
							name: 'actionDate',
							type: 'date',
							value: defaultDay,
						},
					],
					buttons: [
						{
							text: 'Cancelar',
							role: 'cancel',
							handler: () => {
								resolve(undefined);
							},
						},
						{
							text: 'Continuar',
							handler: (data: Record<string, unknown>) => {
								let raw: unknown = data?.['actionDate'];
								if (raw === undefined && Array.isArray(data?.['values'])) {
									const vals = data['values'] as unknown[];
									raw = vals.length ? vals[0] : undefined;
								}
								const ts =
									typeof raw === 'string'
										? toCanonicalMexicoDateTimestamp(raw)
										: raw != null
											? toCanonicalMexicoDateTimestamp(String(raw))
											: undefined;
								if (ts === undefined) return false;
								resolve(ts);
								return true;
							},
						},
					],
				})
				.then((a) => a.present());
		});
	}

	/**
	 * Pide la fecha del informe; solo si confirma (y motivo si aplica) descarga el PDF y marca BREAKDOWN_SENT.
	 */
	async downloadCalculationAndMarkBreakdown(s: AdvisorCutSummaryWithState) {
		const stateCutDate = this.getStateCutDate(s);
		const at = await this.promptStepActionDate(
			'¿En qué fecha se envió el informe de cálculo (desglose) a la asesora?'
		);
		if (at === undefined) return;
		const deadline = getBreakdownDeadline(stateCutDate);
		const wasLate = at > deadline;
		let lateEntry: LateReasonEntry | undefined;
		if (wasLate) {
			const result = await this.openLateReasonModal(
				'DESGLOSE',
				s,
				'Se superó el plazo para el informe de cálculo. Indica el motivo (reemplaza el registrado automáticamente si aplica).'
			);
			if (!result) return;
			lateEntry = { step: 'DESGLOSE', reason: result.reason, text: result.text };
		}
		try {
			const pendingUids = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt).map((p) => p.uid);
			const deferredPays = this.getDeferredPaymentsInSummary(s);
			if (deferredPays.length === 0) {
				if (pendingUids.length) {
					await this.paymentFirestore.applyBreakdownSentToPaymentUids(pendingUids, {
						breakdownSentAt: at,
						lateEntry,
					});
				}
			} else {
				const defCut = s.cutDate;
				const caseKind = classifyDeferralPaymentCase(defCut, [at]) ?? 'ON_OR_AFTER_DEFERRED_CUT';
				const originals = [...new Set(deferredPays.map((p) => p.cutDate))];
				if (caseKind === 'BEFORE_DEFERRED_CUT') {
					await this.paymentFirestore.clearDeferredToCutDateForPaymentUids(deferredPays.map((p) => p.uid));
					for (const orig of originals) {
						const uids = deferredPays.filter((p) => p.cutDate === orig).map((p) => p.uid);
						if (uids.length) {
							await this.paymentFirestore.applyBreakdownSentToPaymentUids(uids, {
								breakdownSentAt: at,
								lateEntry,
							});
						}
					}
				} else if (pendingUids.length) {
					await this.paymentFirestore.applyBreakdownSentToPaymentUids(pendingUids, {
						breakdownSentAt: at,
						lateEntry,
					});
				}
			}
			this.pdfService.exportAdvisorCutCalculation(s);
			this.refreshCutData(true);
		} catch (err) {
			console.error(err);
			const t = await this.toastCtrl.create({
				message: 'No se guardó el desglose en Firestore. Revisa conexión o reglas de seguridad.',
				duration: 5500,
				color: 'danger',
			});
			await t.present();
		}
	}

	async beginInvoiceAttach(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement, stateCutDate?: number) {
		const effectiveStateCutDate = stateCutDate ?? this.getStateCutDate(s);
		const at = await this.promptStepActionDate('¿En qué fecha la asesora envió su factura?');
		if (at === undefined) return;
		const st = this.getAdvisorStateForCut(s.advisorUid, effectiveStateCutDate);
		const invoiceDeadline = st?.breakdownSentAt
			? getInvoiceDeadline(st.breakdownSentAt)
			: getBreakdownDeadline(effectiveStateCutDate);
		const wouldBeLate = at > invoiceDeadline;
		const isDeferred = !!(st?.movedToNextCut || st?.originalCutDate);
		const needsReason = wouldBeLate || isDeferred;
		let lateEntry: LateReasonEntry | undefined;
		if (needsReason) {
			const result = await this.openLateReasonModal(
				'FACTURA',
				s,
				isDeferred
					? 'Hay comisiones diferidas. Indica el motivo antes de seleccionar el archivo.'
					: 'La fecha supera el plazo de factura. Indica el motivo antes de seleccionar el archivo.'
			);
			if (!result) return;
			lateEntry = { step: 'FACTURA', reason: result.reason, text: result.text };
		}
		this.pendingFileAttach = {
			kind: 'invoice',
			advisorUid: s.advisorUid,
			stateCutDate: effectiveStateCutDate,
			summaryCutDate: s.cutDate,
			at,
			lateEntry,
			s,
		};
		setTimeout(() => fileInput.click(), 0);
	}

	async beginReceiptAttach(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement, stateCutDate?: number) {
		const effectiveStateCutDate = stateCutDate ?? this.getStateCutDate(s);
		const at = await this.promptStepActionDate('¿En qué fecha se realizó el pago de comisiones?');
		if (at === undefined) return;
		const st = this.getAdvisorStateForCut(s.advisorUid, effectiveStateCutDate);
		const paymentDeadline = st?.invoiceSentAt ? getPaymentDeadline(st.invoiceSentAt) : undefined;
		const paymentWouldBeLate = !!paymentDeadline && at > paymentDeadline;
		const isDeferred = !!(st?.movedToNextCut || st?.originalCutDate);
		const needsReason = paymentWouldBeLate || isDeferred;
		let lateEntry: LateReasonEntry | undefined;
		if (needsReason) {
			const result = await this.openLateReasonModal(
				'PAGO',
				s,
				isDeferred
					? 'Hay comisiones diferidas. Indica el motivo antes de seleccionar el archivo.'
					: 'La fecha supera el plazo de pago. Indica el motivo antes de seleccionar el archivo.'
			);
			if (!result) return;
			lateEntry = { step: 'PAGO', reason: result.reason, text: result.text };
		}
		this.pendingFileAttach = {
			kind: 'receipt',
			advisorUid: s.advisorUid,
			stateCutDate: effectiveStateCutDate,
			summaryCutDate: s.cutDate,
			at,
			lateEntry,
			s,
		};
		setTimeout(() => fileInput.click(), 0);
	}

	async markInvoiceStatusOnly(s: AdvisorCutSummaryWithState) {
		const stateCutDate = this.getStateCutDate(s);
		const at = await this.promptStepActionDate('¿En qué fecha se recibió la factura de la asesora?');
		if (at === undefined) return;
		const st = this.getAdvisorStateForCut(s.advisorUid, stateCutDate);
		const invoiceDeadline = st?.breakdownSentAt
			? getInvoiceDeadline(st.breakdownSentAt)
			: getBreakdownDeadline(stateCutDate);
		const wouldBeLate = at > invoiceDeadline;
		const isDeferred = !!(st?.movedToNextCut || st?.originalCutDate);
		const needsReason = wouldBeLate || isDeferred;
		let lateEntry: LateReasonEntry | undefined;
		if (needsReason) {
			const result = await this.openLateReasonModal(
				'FACTURA',
				s,
				isDeferred
					? 'Hay comisiones diferidas. Indica el motivo antes de cambiar estatus.'
					: 'La fecha supera el plazo de factura. Indica el motivo antes de cambiar estatus.'
			);
			if (!result) return;
			lateEntry = { step: 'FACTURA', reason: result.reason, text: result.text };
		}
		const deferredFlow = await this.applyDeferredCaseInvoiceFlow(s, at, lateEntry, undefined);
		if (deferredFlow !== 'use-legacy') {
			this.refreshCutData(true);
			return;
		}
		const uids = s.payments
			.filter((p) => !p.cancelled && !p.paid && !p.paidAt && p.breakdownSentAt)
			.map((p) => p.uid);
		if (uids.length) {
			await this.paymentFirestore.applyInvoiceSentToPaymentUids(uids, {
				invoiceSentAt: at,
				lateEntry,
			});
		}
		const sample = s.payments.find((p) => uids.includes(p.uid)) ?? s.payments[0];
		const syn = sample ? commissionPaymentToSyntheticAdvisorState(sample) : null;
		const invoiceDeadlineForCheck = syn?.breakdownSentAt
			? getInvoiceDeadline(syn.breakdownSentAt)
			: getBreakdownDeadline(stateCutDate);
		const invoiceWasLate = isInvoiceLate(at, invoiceDeadlineForCheck);
		if (invoiceWasLate) {
			const uidsAtCut = await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, s.advisorUid, true);
			const nextCutDate = getNextCutDate(stateCutDate);
			await this.paymentFirestore.movePaymentsToNextCut(stateCutDate, s.advisorUid, nextCutDate);
			if (!lateEntry && uidsAtCut.length) {
				await this.paymentFirestore.mergeLateReasonToPaymentUids(uidsAtCut, {
					step: 'FACTURA',
					reason: 'FACTURA_NO_RECIBIDA_A_TIEMPO',
					at: Date.now(),
				});
			}
		}
		this.refreshCutData(true);
	}

	async markPaidStatusOnly(s: AdvisorCutSummaryWithState) {
		const stateCutDate = this.getStateCutDate(s);
		const at = await this.promptStepActionDate('¿En qué fecha se realizó el pago de comisiones?');
		if (at === undefined) return;
		const st = this.getAdvisorStateForCut(s.advisorUid, stateCutDate);
		const paymentDeadline = st?.invoiceSentAt ? getPaymentDeadline(st.invoiceSentAt) : undefined;
		const paymentWouldBeLate = !!paymentDeadline && at > paymentDeadline;
		const isDeferred = !!(st?.movedToNextCut || st?.originalCutDate);
		const needsReason = paymentWouldBeLate || isDeferred;
		let lateEntry: LateReasonEntry | undefined;
		if (needsReason) {
			const result = await this.openLateReasonModal(
				'PAGO',
				s,
				isDeferred
					? 'Hay comisiones diferidas. Indica el motivo antes de cambiar estatus.'
					: 'La fecha supera el plazo de pago. Indica el motivo antes de cambiar estatus.'
			);
			if (!result) return;
			lateEntry = { step: 'PAGO', reason: result.reason, text: result.text };
		}
		const paidDeferred = await this.applyDeferredCaseMarkPaidFlow(s, at, lateEntry, undefined);
		if (paidDeferred !== 'use-legacy') {
			this.commissionPaymentFacade.markPaidByCutDateAndAdvisor(s.cutDate, s.advisorUid, at);
			this.refreshCutData(true);
			return;
		}
		const uids = s.payments
			.filter((p) => !p.cancelled && !p.paid && !p.paidAt && p.invoiceSentAt)
			.map((p) => p.uid);
		if (uids.length) {
			await this.paymentFirestore.applyPaidToPaymentUids(uids, { paidAt: at, lateEntry });
		}
		this.commissionPaymentFacade.markPaidByCutDateAndAdvisor(s.cutDate, s.advisorUid, at);
		this.refreshCutData(true);
	}

	private async finishInvoiceWithFile(file: File) {
		const p = this.pendingFileAttach;
		if (!p || p.kind !== 'invoice') return;
		this.pendingFileAttach = null;
		const { advisorUid, stateCutDate, at, lateEntry } = p;
		const currentState = this.getAdvisorStateForCut(advisorUid, stateCutDate);

		try {
			await this.withUploadLoading('Subiendo factura…', async () => {
				const invoiceUrl = await this.attachmentService.uploadAttachment(stateCutDate, advisorUid, 'invoice', file);
				if (currentState?.state === 'PAID') {
					const uidsPaid = await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, advisorUid, false);
					if (uidsPaid.length) {
						await this.paymentFirestore.patchInvoiceFieldsOnPaymentUids(uidsPaid, { invoiceUrl, invoiceSentAt: at });
					}
					this.refreshCutData(true);
					return;
				}
				const defInv = p.s ? await this.applyDeferredCaseInvoiceFlow(p.s, at, lateEntry, invoiceUrl) : 'use-legacy';
				if (defInv !== 'use-legacy') {
					this.refreshCutData(true);
					return;
				}
				const uids = p.s
					? p.s.payments
							.filter((x) => !x.cancelled && !x.paid && !x.paidAt && x.breakdownSentAt)
							.map((x) => x.uid)
					: await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, advisorUid, true);
				if (uids.length) {
					await this.paymentFirestore.applyInvoiceSentToPaymentUids(uids, {
						invoiceSentAt: at,
						invoiceUrl,
						lateEntry,
					});
				}
				const sample = p.s?.payments.find((x) => uids.includes(x.uid));
				const syn = sample ? commissionPaymentToSyntheticAdvisorState(sample) : null;
				const invoiceDeadlineForCheck = syn?.breakdownSentAt
					? getInvoiceDeadline(syn.breakdownSentAt)
					: getBreakdownDeadline(stateCutDate);
				const invoiceWasLate = isInvoiceLate(at, invoiceDeadlineForCheck);
				if (invoiceWasLate) {
					const uidsAtCut = await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, advisorUid, true);
					const nextCutDate = getNextCutDate(stateCutDate);
					await this.paymentFirestore.movePaymentsToNextCut(stateCutDate, advisorUid, nextCutDate);
					if (!lateEntry && uidsAtCut.length) {
						await this.paymentFirestore.mergeLateReasonToPaymentUids(uidsAtCut, {
							step: 'FACTURA',
							reason: 'FACTURA_NO_RECIBIDA_A_TIEMPO',
							at: Date.now(),
						});
					}
				}
				this.refreshCutData(true);
			});
		} catch {
			const t = await this.toastCtrl.create({
				message: 'No se pudo subir la factura. Intenta de nuevo.',
				duration: 4000,
				color: 'danger',
				position: 'top',
			});
			await t.present();
		}
	}

	private async finishReceiptWithFile(file: File) {
		const p = this.pendingFileAttach;
		if (!p || p.kind !== 'receipt') return;
		this.pendingFileAttach = null;
		const { advisorUid, stateCutDate, summaryCutDate, at, lateEntry } = p;
		const currentState = this.getAdvisorStateForCut(advisorUid, stateCutDate);

		try {
			await this.withUploadLoading('Subiendo comprobante de pago…', async () => {
				const receiptUrl = await this.attachmentService.uploadAttachment(stateCutDate, advisorUid, 'receipt', file);
				if (currentState?.state === 'PAID') {
					const uidsPaid = await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, advisorUid, false);
					if (uidsPaid.length) {
						await this.paymentFirestore.patchReceiptFieldsOnPaymentUids(uidsPaid, { receiptUrl, receiptSentAt: at });
					}
					this.refreshCutData(true);
					return;
				}
				const defPaid = p.s ? await this.applyDeferredCaseMarkPaidFlow(p.s, at, lateEntry, receiptUrl) : 'use-legacy';
				if (defPaid !== 'use-legacy') {
					this.commissionPaymentFacade.markPaidByCutDateAndAdvisor(summaryCutDate, advisorUid, at);
					this.refreshCutData(true);
					return;
				}
				const uids = p.s
					? p.s.payments
							.filter((x) => !x.cancelled && !x.paid && !x.paidAt && x.invoiceSentAt)
							.map((x) => x.uid)
					: await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, advisorUid, true);
				if (uids.length) {
					await this.paymentFirestore.applyPaidToPaymentUids(uids, { paidAt: at, receiptUrl, lateEntry });
				}
				this.commissionPaymentFacade.markPaidByCutDateAndAdvisor(summaryCutDate, advisorUid, at);
				this.refreshCutData(true);
			});
		} catch {
			const t = await this.toastCtrl.create({
				message: 'No se pudo subir el comprobante. Intenta de nuevo.',
				duration: 4000,
				color: 'danger',
				position: 'top',
			});
			await t.present();
		}
	}

	/** Abre el modal de motivo de atraso. Retorna el resultado o undefined si canceló. */
	private async openLateReasonModal(
		step: 'DESGLOSE' | 'FACTURA' | 'PAGO',
		s?: AdvisorCutSummaryWithState,
		subtitle?: string
	): Promise<{ reason: string; text?: string } | undefined> {
		const modal = await this.modalCtrl.create({
			component: LateReasonModalComponent,
			componentProps: {
				step,
				subtitle: subtitle ?? `Indica el motivo de atraso para el paso ${step}.`,
			},
		});
		await modal.present();
		const { data, role } = await modal.onWillDismiss();
		return role === 'ok' ? data : undefined;
	}

	onInvoiceFilePicked(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) void this.finishInvoiceWithFile(file);
		else if (this.pendingFileAttach?.kind === 'invoice') this.pendingFileAttach = null;
	}

	onReceiptFilePicked(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) void this.finishReceiptWithFile(file);
		else if (this.pendingFileAttach?.kind === 'receipt') this.pendingFileAttach = null;
	}

	private getAdvisorAttachmentActionOptions(
		s: AdvisorCutSummaryWithState,
	): Array<'invoice' | 'receipt'> {
		const state = s.advisorWorkflowDerived ?? s.state?.state ?? 'PENDING';
		if (state === 'MIXED') return ['invoice', 'receipt'];
		if (state === 'PENDING') return [];
		if (state === 'BREAKDOWN_SENT') return ['invoice'];
		if (state === 'SENT_TO_PAYMENT') return ['receipt'];
		if (state === 'PAID') return ['invoice', 'receipt'];
		return [];
	}

	canShowAdvisorAttachmentActions(s: AdvisorCutSummaryWithState): boolean {
		return this.getAdvisorAttachmentActionOptions(s).length > 0;
	}

	async openAdvisorAttachmentActions(
		s: AdvisorCutSummaryWithState,
		invoiceInput: HTMLInputElement,
		receiptInput: HTMLInputElement,
	) {
		const options = this.getAdvisorAttachmentActionOptions(s);
		if (!options.length) return;
		const buttons: Array<{ text: string; handler: () => void }> = [];
		if (options.includes('invoice')) {
			buttons.push({
				text: 'Subir Factura',
				handler: () => {
					void this.beginInvoiceAttach(s, invoiceInput);
				},
			});
		}
		if (options.includes('receipt')) {
			buttons.push({
				text: 'Subir Comprobante',
				handler: () => {
					void this.beginReceiptAttach(s, receiptInput);
				},
			});
		}
		const sheet = await this.actionSheetCtrl.create({
			header: 'Acciones de comisión',
			buttons: [
				...buttons,
				{ text: 'Cancelar', role: 'cancel' },
			],
		});
		await sheet.present();
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

	groupSummariesByCutDate(summaries: AdvisorCutSummaryWithState[]): CutSummariesGroup[] {
		const byCut = new Map<number, AdvisorCutSummaryWithState[]>();
		for (const s of summaries) {
			const arr = byCut.get(s.cutDate) ?? [];
			arr.push(s);
			byCut.set(s.cutDate, arr);
		}
		return Array.from(byCut.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([cutDate, items]) => ({ cutDate, items }));
	}

	/** Lista plana en orden de corte (export por asesora, etc.). */
	flattenCutGroups(groups: CutSummariesGroup[]): AdvisorCutSummaryWithState[] {
		return groups.flatMap((g) => g.items);
	}

	exportPdfByAdvisor(advisorName: string, summaries: AdvisorCutSummaryWithState[]) {
		const totalAmount = summaries.reduce((a, s) => a + s.totalAmount, 0);
		const pendingAmount = summaries.reduce((a, s) => a + s.pendingAmount, 0);
		const paidAmount = summaries.reduce((a, s) => a + s.paidAmount, 0);
		this.pdfService.exportByAdvisor(advisorName, summaries, totalAmount, pendingAmount, paidAmount);
	}
}
