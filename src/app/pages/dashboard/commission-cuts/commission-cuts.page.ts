import { Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, map, BehaviorSubject, firstValueFrom, skip, take } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { CommissionPaymentFacade } from 'src/app/store/commission-payment/commission-payment.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
import type { AdvisorFiscalActivity } from 'src/app/store/advisor/advisor.model';
import { Contract } from 'src/app/store/contract/contract.model';
import { ContractFacade } from 'src/app/store/contract/contract.facade';

import { AdvisorCutSummary } from 'src/app/models/commission-cuts-summary.model';
import {
	COMMISSION_CUT_LATE_REASONS,
	LATE_REASON_CODES_BY_STEP,
	type LateReasonEntry,
	type LateReasonStep,
	getLateReasonLabel,
	normalizeLateReasons,
} from 'src/app/models/commission-cut-late-reason.model';
import {
	ProcessDeferredModalComponent,
	type ProcessDeferredModalGroupInput,
	type ProcessDeferredResult,
} from 'src/app/components/process-deferred-modal/process-deferred-modal.component';
import { CommissionCutAttachmentService } from 'src/app/services/commission-cut-attachment.service';
import { CommissionCutsPdfService } from 'src/app/services/commission-cuts-pdf.service';
import { ExcelExportService } from 'src/app/services/excel-export.service';
import {
	classifyDeferralPaymentCase,
	getBreakdownDeadline,
	computeDeferralDisplayIndexFromPayments,
	getEffectiveDeferredDisplayCut,
	getInvoiceDeadline,
	getLastCutDateOnOrBefore,
	getMinValidTargetCut,
	getNextCutDate,
	getPaymentDeadline,
	getSentToPaymentDeadline,
	isInvoiceLate,
	isInvoiceOverdue,
	isPaymentOverdue,
	paymentFlowHasAnyLateStep,
	paymentTrasladadaChipLabel as computePaymentTrasladadaChipLabel,
	normalizeDeferredToCutStored,
	sameCanonicalCutDate,
} from 'src/app/domain/commission-cut/commission-cut-deadlines.util';
import {
	commissionPaymentToSyntheticAdvisorState,
	deriveAdvisorWorkflowFromPayments,
	paymentWorkflowStateAtCut,
	type AdvisorWorkflowState,
	type DerivedAdvisorWorkflow,
} from 'src/app/domain/commission-cut/commission-payment-workflow.util';
import {
	isAfterMexicoDate,
	toCanonicalMexicoDateTimestamp,
	toMexicoDateInputValue,
} from 'src/app/domain/time/mexico-time.util';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';
import type { CommissionProcessingMode } from 'src/app/models/commission-processing-mode.model';
import { ActionSheetController, AlertController, IonContent, LoadingController, ModalController, ToastController } from '@ionic/angular';

export type AdvisorCutSummaryWithState = AdvisorCutSummary & {
	state: AdvisorWorkflowState | null;
	/** Agregado de líneas en la tarjeta (incluye MIXED). */
	advisorWorkflowDerived?: DerivedAdvisorWorkflow;
	/** Estado del flujo en el corte **original** de cada línea (uid de pago → estado). */
	paymentDeferralStates?: Map<string, AdvisorWorkflowState | null>;
	invoiceDeadline?: number;
	sentToPaymentDeadline?: number;
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
	@ViewChild(IonContent) private content?: IonContent;

	/** Snapshot síncrono para getAdvisorStateForCut (mismo orden que el store). */
	private latestPaymentsSnapshot: CommissionPayment[] = [];
	private latestAdvisorsSnapshot: Record<string, { fiscalActivity?: AdvisorFiscalActivity }> = {};

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
		this.contracts$,
		this.filterCutDate$,
		this.filterAdvisorUid$,
	]).pipe(
		map(([idx, advisorsDic, contracts, filterCut, filterAdvisor]) => {
			const { payments, horizon, effectiveByUid } = idx;
			const contractMap = new Map<string, Contract>();
			contracts.forEach((c) => contractMap.set(c.uid, c));
			const byCutAdvisor = new Map<string, AdvisorCutSummary>();

			const addToBucket = (p: CommissionPayment, effectiveCutDate: number) => {
				if (filterCut != null && effectiveCutDate !== filterCut) return;
				if (filterAdvisor != null && p.advisorUid !== filterAdvisor) return;

				const key = `${effectiveCutDate}::${p.advisorUid}`;
				const name = this.resolveCutPaymentAdvisorDisplayName(
					advisorsDic as Record<string, { name?: string; displayName?: string }>,
					contractMap,
					p,
				);
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
					const nameNow = this.resolveCutPaymentAdvisorDisplayName(
						advisorsDic as Record<string, { name?: string; displayName?: string }>,
						contractMap,
						p,
					);
					if (existing.advisorName === 'Desconocido' && nameNow !== 'Desconocido') {
						existing.advisorName = nameNow;
					}
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
				if (p.paid || p.paidAt) {
					const def = normalizeDeferredToCutStored(p);
					if (def != null && def <= horizon) addToBucket(p, def);
				}
			}

			const result = Array.from(byCutAdvisor.values());
			result.sort((a, b) => {
				if (a.cutDate !== b.cutDate) return a.cutDate - b.cutDate;
				const ar = CommissionCutsPage.isReferralCutSummary(a) ? 1 : 0;
				const br = CommissionCutsPage.isReferralCutSummary(b) ? 1 : 0;
				if (ar !== br) return ar - br;
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
				const sentToPaymentDeadline = state?.invoiceSentAt
					? getSentToPaymentDeadline(state.invoiceSentAt)
					: undefined;
				const paymentDeadline = state?.sentToPaymentAt ? getPaymentDeadline(state.sentToPaymentAt) : undefined;
				const invOverdue = invoiceDeadline ? isInvoiceOverdue(state?.invoiceSentAt, invoiceDeadline) : false;
				const sentToPayOverdue = sentToPaymentDeadline
					? isPaymentOverdue(state?.sentToPaymentAt, sentToPaymentDeadline)
					: false;
				const payOverdue = paymentDeadline ? isPaymentOverdue(state?.receiptSentAt, paymentDeadline) : false;
				const hasLateReasons = normalizeLateReasons(state?.lateReasons).length > 0;
				const isDeferred = !!(state?.movedToNextCut || state?.originalCutDate);
				const isOverdue =
					(s.pendingAmount > 0 && (invOverdue || sentToPayOverdue || payOverdue)) ||
					(s.pendingAmount > 0 && hasLateReasons) ||
					(s.pendingAmount > 0 && isDeferred);

				const paymentDeferralStates = new Map<string, AdvisorWorkflowState | null>();
				for (const p of s.payments) {
					paymentDeferralStates.set(p.uid, paymentWorkflowStateAtCut(p, s.cutDate));
				}

				return {
					...s,
					state,
					advisorWorkflowDerived: derived,
					paymentDeferralStates,
					invoiceDeadline,
					sentToPaymentDeadline,
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
		INVOICE_RECIVED: 'Factura recibida',
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

	/** Referidor(a) en contrato (`roles.referral`) no está en catálogo de asesores. */
	private resolveCutPaymentAdvisorDisplayName(
		advisorsDic: Record<string, { name?: string; displayName?: string }>,
		contractMap: Map<string, Contract>,
		p: CommissionPayment,
	): string {
		const fromDic = advisorsDic?.[p.advisorUid]?.name ?? advisorsDic?.[p.advisorUid]?.displayName;
		if (fromDic) return fromDic;

		const isReferral = p.role?.toUpperCase?.() === 'REFERRAL';
		if (isReferral && p.contractUid) {
			const ref = contractMap.get(p.contractUid)?.roles?.referral?.trim();
			if (ref) return ref;
		}

		if (p.advisorUid?.trim()) return p.advisorUid.trim();

		return 'Desconocido';
	}

	private static readonly LATE_STEP_ORDER: Record<LateReasonStep, number> = {
		DESGLOSE: 0,
		FACTURA: 1,
		PAGO: 2,
	};

	/** Tarjeta de corte solo-referidor: va al final del listado (tras el resto alfabético). */
	private static isReferralCutSummary(s: { payments: CommissionPayment[] }): boolean {
		return s.payments.length > 0 && s.payments.every((p) => p.role?.toUpperCase?.() === 'REFERRAL');
	}

	/** UIDs de comisiones diferidas seleccionadas para procesar (Path 2). */
	selectedDeferredIds = new Set<string>();

	/** Accordion "Motivos" (por uid de pago) en cada fila. */
	private motivosOpenByPaymentUid = new Set<string>();

	toggleMotivosAccordion(paymentUid: string) {
		if (this.motivosOpenByPaymentUid.has(paymentUid)) {
			this.motivosOpenByPaymentUid.delete(paymentUid);
		} else {
			this.motivosOpenByPaymentUid.add(paymentUid);
		}
		// Reasignar para que Angular detecte cambios con OnPush/Signals mixtos.
		this.motivosOpenByPaymentUid = new Set(this.motivosOpenByPaymentUid);
	}

	isMotivosAccordionOpen(paymentUid: string): boolean {
		return this.motivosOpenByPaymentUid.has(paymentUid);
	}

	/** Tras elegir fecha, abre el input de archivo oculto. */
	private pendingFileAttach: {
		kind: 'invoice' | 'receipt';
		advisorUid: string;
		stateCutDate: number;
		summaryCutDate: number;
		at: number;
		lateEntry?: LateReasonEntry;
		/** Solo estos UIDs reciben `lateReasons` en factura/pago (flujo grupal mixto). */
		invoiceUidsRequiringLateReason?: string[];
		paymentUidsRequiringLateReason?: string[];
		s: AdvisorCutSummaryWithState;
		/** Tarjeta asesora = GROUPED (default). */
		processingMode: CommissionProcessingMode;
	} | null = null;

	constructor(
		private destroyRef: DestroyRef,
		private commissionPaymentFacade: CommissionPaymentFacade,
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private attachmentService: CommissionCutAttachmentService,
		private pdfService: CommissionCutsPdfService,
		private excelExportService: ExcelExportService,
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
		this.advisors$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((entities) => {
			this.latestAdvisorsSnapshot = (entities as Record<string, { fiscalActivity?: AdvisorFiscalActivity }>) ?? {};
		});
	}

	private advisorFiscalActivityForSummary(s: AdvisorCutSummaryWithState): AdvisorFiscalActivity | undefined {
		return this.latestAdvisorsSnapshot?.[s.advisorUid]?.fiscalActivity;
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

	/** Loading para acciones de transición de estatus (evita sensación de "no pasó nada"). */
	private async withStatusActionLoading<T>(message: string, fn: () => Promise<T>): Promise<T> {
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
		state: AdvisorWorkflowState | null,
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

		if (st?.invoiceSentAt && st.state !== 'PAID' && !st.sentToPaymentAt) {
			const sentToPayDl = getSentToPaymentDeadline(st.invoiceSentAt);
			if (isPaymentOverdue(undefined, sentToPayDl)) {
				entries.push({ step: 'PAGO', reason: 'PAGO_NO_REALIZADO_A_TIEMPO' });
			}
		}

		if (st?.sentToPaymentAt && st.state !== 'PAID' && !st.receiptSentAt) {
			const payDl = getPaymentDeadline(st.sentToPaymentAt);
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
	private footerActionsMenuKey: string | null = null;
	private footerActionsMenuOpenUpKeys = new Set<string>();

	breakdownRowKey(s: AdvisorCutSummaryWithState): string {
		return `breakdown::${s.advisorUid}::${s.cutDate}`;
	}

	toggleSummaryExpanded(s: AdvisorCutSummaryWithState) {
		const key = this.breakdownRowKey(s);
		const next = this.expandedSummaryKey === key ? null : key;
		this.expandedSummaryKey = next;
		this.footerActionsMenuKey = null;
		if (next === null) {
			this.expandedContractKeys = new Set();
		} else {
			this.expandedContractKeys = new Set();
		}
	}

	isSummaryExpanded(s: AdvisorCutSummaryWithState): boolean {
		return this.expandedSummaryKey === this.breakdownRowKey(s);
	}

	private footerMenuKeyForSummary(s: AdvisorCutSummaryWithState): string {
		return `footerMenu::${s.advisorUid}::${s.cutDate}`;
	}

	toggleFooterActionsMenu(s: AdvisorCutSummaryWithState, hostEl?: HTMLElement, event?: Event) {
		event?.stopPropagation();
		const key = this.footerMenuKeyForSummary(s);
		if (this.footerActionsMenuKey === key) {
			this.footerActionsMenuKey = null;
			this.footerActionsMenuOpenUpKeys.delete(key);
			this.footerActionsMenuOpenUpKeys = new Set(this.footerActionsMenuOpenUpKeys);
			return;
		}
		this.footerActionsMenuKey = key;
		const estimatedHeight = this.estimateFooterMenuHeight(s);
		const hostRect = hostEl?.getBoundingClientRect();
		const viewportBottom = window.innerHeight;
		const opensUp = hostRect ? hostRect.bottom + 8 + estimatedHeight > viewportBottom - 8 : false;
		if (opensUp) this.footerActionsMenuOpenUpKeys.add(key);
		else this.footerActionsMenuOpenUpKeys.delete(key);
		this.footerActionsMenuOpenUpKeys = new Set(this.footerActionsMenuOpenUpKeys);
	}

	@HostListener('document:click', ['$event'])
	onDocumentClickCloseFooterMenu(event: MouseEvent) {
		if (!this.footerActionsMenuKey) return;
		const target = event.target as Node | null;
		if (!target) return;
		const clickedInsideMenu = !!(target as Element).closest?.('.footer-menu-wrap');
		if (clickedInsideMenu) return;
		this.footerActionsMenuKey = null;
	}

	isFooterActionsMenuOpen(s: AdvisorCutSummaryWithState): boolean {
		return this.footerActionsMenuKey === this.footerMenuKeyForSummary(s);
	}

	isFooterActionsMenuOpenUp(s: AdvisorCutSummaryWithState): boolean {
		return this.footerActionsMenuOpenUpKeys.has(this.footerMenuKeyForSummary(s));
	}

	private estimateFooterMenuHeight(s: AdvisorCutSummaryWithState): number {
		let rows = 1; // Descargar cálculo
		const uiKey = this.cardWorkflowUiKey(s);
		if (uiKey === 'SENT_TO_PAYMENT') rows += 1; // factura
		if (uiKey === 'PAID') rows += 2; // factura + comprobante
		if (uiKey === 'MIXED') rows += 2; // factura + comprobante
		return rows * 66 + 20;
	}

	private getMixedNextGroupAction(
		s: AdvisorCutSummaryWithState,
	): 'BREAKDOWN' | 'INVOICE' | 'SENT_TO_PAYMENT' | 'PAID' | null {
		const active = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt);
		if (!active.length) return null;
		if (active.some((p) => !p.breakdownSentAt)) return 'BREAKDOWN';
		if (active.some((p) => p.breakdownSentAt && !p.invoiceSentAt)) return 'INVOICE';
		if (active.some((p) => p.invoiceSentAt && !p.sentToPaymentAt)) return 'SENT_TO_PAYMENT';
		if (active.some((p) => this.paymentReadyForPaidStep(p))) return 'PAID';
		return null;
	}

	getMixedAdvanceActionLabel(s: AdvisorCutSummaryWithState): string {
		const next = this.getMixedNextGroupAction(s);
		if (next === 'BREAKDOWN') return 'Descargar cálculo';
		if (next === 'INVOICE') return 'Factura recibida';
		if (next === 'SENT_TO_PAYMENT') return 'Enviada a pago';
		if (next === 'PAID') return 'Marcar como pagada';
		return 'Continuar estatus';
	}

	async advanceMixedGroupStatus(s: AdvisorCutSummaryWithState) {
		const next = this.getMixedNextGroupAction(s);
		if (next === 'BREAKDOWN') {
			await this.downloadCalculationAndMarkBreakdown(s);
			return;
		}
		if (next === 'INVOICE') {
			await this.markInvoiceStatusOnly(s);
			return;
		}
		if (next === 'SENT_TO_PAYMENT') {
			await this.markSentToPaymentStatusOnly(s);
			return;
		}
		if (next === 'PAID') {
			await this.markPaidStatusOnly(s);
			return;
		}
	}

	canShowInvoiceAttachmentAction(s: AdvisorCutSummaryWithState): boolean {
		return this.getAdvisorAttachmentActionOptions(s).includes('invoice');
	}

	canShowReceiptAttachmentAction(s: AdvisorCutSummaryWithState): boolean {
		return this.getAdvisorAttachmentActionOptions(s).includes('receipt');
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
		if (pay.cancelled) return false;
		if (pay.paid || pay.paidAt) {
			const def = normalizeDeferredToCutStored(pay);
			return (
				def != null &&
				sameCanonicalCutDate(def, summaryCutDate) &&
				summaryCutDate > pay.cutDate
			);
		}
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

	/**
	 * Path 2 (checkbox): solo mientras ninguna diferida impaga de este corte tiene ya desglose
	 * (flujo grupal — ej. “descargar cálculo” a nivel asesora).
	 */
	showDeferredPath2Checkbox(s: AdvisorCutSummaryWithState, pay: CommissionPayment): boolean {
		if (pay.cancelled || pay.paid || pay.paidAt) return false;
		if (pay.deferredToCutDate == null || !sameCanonicalCutDate(pay.deferredToCutDate, s.cutDate)) {
			return false;
		}
		const groupedStarted = s.payments.some(
			(p) =>
				!p.cancelled &&
				p.deferredToCutDate != null &&
				sameCanonicalCutDate(p.deferredToCutDate, s.cutDate) &&
				!p.paid &&
				!p.paidAt &&
				!!p.breakdownSentAt,
		);
		return !groupedStarted;
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
		const deferredCutDate = s.cutDate;

		const byOriginalCut = new Map<number, CommissionPayment[]>();
		for (const p of selected) {
			const orig = p.cutDate;
			if (!byOriginalCut.has(orig)) byOriginalCut.set(orig, []);
			byOriginalCut.get(orig)!.push(p);
		}

		const modalGroups: ProcessDeferredModalGroupInput[] = [];
		for (const [origCut, payments] of byOriginalCut) {
			modalGroups.push({
				originalCutDate: origCut,
				paymentUids: payments.map((p) => p.uid),
				count: payments.length,
				amount: payments.reduce((a, p) => a + (p.amount ?? 0), 0),
			});
		}
		modalGroups.sort((a, b) => a.originalCutDate - b.originalCutDate);

		const modal = await this.modalCtrl.create({
			component: ProcessDeferredModalComponent,
			componentProps: {
				groups: modalGroups,
				totalCount: selected.length,
				totalAmount,
				deferredCutDate,
			},
		});
		await modal.present();
		const { data, role } = await modal.onWillDismiss<ProcessDeferredResult>();
		if (role !== 'ok' || !data?.groups?.length) return;

		type FirestoreGroup = Parameters<
			CommissionPaymentFirestoreService['completeDeferredPath2OnPaymentGroups']
		>[0][number];
		const firestoreGroups: FirestoreGroup[] = [];

		for (const g of data.groups) {
			const invoiceUrl = g.invoiceFile
				? await this.attachmentService.uploadAttachment(
						deferredCutDate,
						s.advisorUid,
						'invoice',
						g.invoiceFile,
					)
				: undefined;
			const receiptUrl = g.receiptFile
				? await this.attachmentService.uploadAttachment(
						deferredCutDate,
						s.advisorUid,
						'receipt',
						g.receiptFile,
					)
				: undefined;

			let targetCutDate: number;
			if (g.breakdownSentAt < deferredCutDate) {
				const candidate = getLastCutDateOnOrBefore(g.breakdownSentAt);
				const minValid = getMinValidTargetCut(g.originalCutDate, deferredCutDate);
				targetCutDate = candidate >= minValid ? candidate : minValid;
			} else {
				targetCutDate = deferredCutDate;
			}

			const lateStepEntries: LateReasonEntry[] = [];
			if (g.breakdownLate && data.motivoDesglose) {
				lateStepEntries.push({
					step: 'DESGLOSE',
					reason: data.motivoDesglose.reason,
					text: data.motivoDesglose.text,
					at: g.breakdownSentAt,
				});
			}
			if (g.invoiceLate && data.motivoFactura) {
				lateStepEntries.push({
					step: 'FACTURA',
					reason: data.motivoFactura.reason,
					text: data.motivoFactura.text,
					at: g.invoiceSentAt,
				});
			}
			if (g.paymentLate && data.motivoPago) {
				lateStepEntries.push({
					step: 'PAGO',
					reason: data.motivoPago.reason,
					text: data.motivoPago.text,
					at: g.receiptSentAt,
				});
			}

			const paidLate = g.breakdownLate || g.invoiceLate || g.paymentLate;

			firestoreGroups.push({
				uids: g.paymentUids,
				targetCutDate,
				originalCutDate: g.originalCutDate,
				breakdownSentAt: g.breakdownSentAt,
				invoiceSentAt: g.invoiceSentAt,
				sentToPaymentAt: g.sentToPaymentAt,
				...(invoiceUrl != null ? { invoiceUrl } : {}),
				receiptSentAt: g.receiptSentAt,
				...(receiptUrl != null ? { receiptUrl } : {}),
				paidLate,
				lateStepEntries: lateStepEntries.length ? lateStepEntries : undefined,
			});
		}

		await this.paymentFirestore.completeDeferredPath2OnPaymentGroups(firestoreGroups);

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
			void this.reloadPaymentsKeepingScrollPosition();
		}
	}

	/** Evita que la lista "salte" al inicio cuando recargamos datos tras cambios de estatus. */
	private async reloadPaymentsKeepingScrollPosition() {
		const scrollTopBefore = await this.getCurrentScrollTop();
		this.commissionPaymentFacade.loadCommissionPaymentsForCuts();
		await firstValueFrom(this.commissionPayments$.pipe(skip(1), take(1)));
		if (scrollTopBefore > 0) {
			requestAnimationFrame(() => {
				void this.content?.scrollToPoint(0, scrollTopBefore, 0);
			});
		}
	}

	private async getCurrentScrollTop(): Promise<number> {
		const scrollEl = await this.content?.getScrollElement();
		return scrollEl?.scrollTop ?? 0;
	}

	/** Desglose tarde respecto al plazo del **corte original** de cada comisión. */
	private paymentNeedsDesgloseLateReason(pay: CommissionPayment, desgloseSentAt: number): boolean {
		return isInvoiceLate(desgloseSentAt, getBreakdownDeadline(pay.cutDate));
	}

	/**
	 * Motivo en factura: comisión con origen diferida en este resumen, o factura después del plazo desde su desglose.
	 */
	private paymentNeedsInvoiceLateReason(s: AdvisorCutSummaryWithState, pay: CommissionPayment, invoiceAt: number): boolean {
		if (!pay.breakdownSentAt) return false;
		return (
			this.paymentShowsDeferredOriginInSummary(pay, s.cutDate) ||
			isInvoiceLate(invoiceAt, getInvoiceDeadline(pay.breakdownSentAt))
		);
	}

	/** Motivo en envío a pago: origen diferida en este resumen, o envío fuera de plazo desde factura. */
	private paymentNeedsSentToPaymentLateReason(
		s: AdvisorCutSummaryWithState,
		pay: CommissionPayment,
		sentToPaymentAt: number,
	): boolean {
		if (!pay.invoiceSentAt) return false;
		return (
			this.paymentShowsDeferredOriginInSummary(pay, s.cutDate) ||
			isInvoiceLate(sentToPaymentAt, getSentToPaymentDeadline(pay.invoiceSentAt))
		);
	}

	/** Motivo en pago: origen diferida en este resumen, o pago después del plazo desde envío a pago. */
	private paymentNeedsPaymentLateReason(s: AdvisorCutSummaryWithState, pay: CommissionPayment, paidAt: number): boolean {
		if (!pay.sentToPaymentAt) return false;
		return (
			this.paymentShowsDeferredOriginInSummary(pay, s.cutDate) ||
			isInvoiceLate(paidAt, getPaymentDeadline(pay.sentToPaymentAt))
		);
	}

	private paymentReadyForPaidStep(pay: CommissionPayment): boolean {
		return !!pay.sentToPaymentAt;
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
	 * Factura con diferidas en el resumen. Sin diferidas → `'use-legacy'`.
	 * - **GROUPED:** todas las líneas con desglose en la tarjeta; no limpiar diferido ni `movePaymentsToNextCut`.
	 * - **INDIVIDUAL:** Caso 1/2 (`classifyDeferralPaymentCase`) + traslados por factura tarde.
	 */
	private async applyDeferredCaseInvoiceFlow(
		s: AdvisorCutSummaryWithState,
		at: number,
		lateEntry: LateReasonEntry | undefined,
		invoiceUrl: string | undefined,
		mode: CommissionProcessingMode,
		groupedInvoiceLateUids?: string[],
	): Promise<'use-legacy' | { invoiceWasLateAny: boolean }> {
		const deferredPays = this.getDeferredPaymentsInSummary(s);
		if (deferredPays.length === 0) return 'use-legacy';

		if (mode === 'GROUPED') {
			const pending = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt && p.breakdownSentAt);
			if (!pending.length) return { invoiceWasLateAny: false };
			if (groupedInvoiceLateUids?.length && lateEntry) {
				const need = new Set(groupedInvoiceLateUids);
				const withL = pending.filter((p) => need.has(p.uid)).map((p) => p.uid);
				const withoutL = pending.filter((p) => !need.has(p.uid)).map((p) => p.uid);
				if (withL.length) {
					await this.paymentFirestore.applyInvoiceSentToPaymentUids(withL, {
						invoiceSentAt: at,
						invoiceUrl,
						lateEntry,
					});
				}
				if (withoutL.length) {
					await this.paymentFirestore.applyInvoiceSentToPaymentUids(withoutL, {
						invoiceSentAt: at,
						invoiceUrl,
					});
				}
			} else {
				await this.paymentFirestore.applyInvoiceSentToPaymentUids(
					pending.map((p) => p.uid),
					{ invoiceSentAt: at, invoiceUrl, lateEntry },
				);
			}
			return { invoiceWasLateAny: false };
		}

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

	/** Pago con diferidas en el resumen. Sin diferidas → `'use-legacy'`. */
	private async applyDeferredCaseMarkPaidFlow(
		s: AdvisorCutSummaryWithState,
		at: number,
		lateEntry: LateReasonEntry | undefined,
		receiptUrl: string | undefined,
		mode: CommissionProcessingMode,
		groupedPaymentLateUids?: string[],
	): Promise<'use-legacy' | void> {
		const deferredPays = this.getDeferredPaymentsInSummary(s);
		if (deferredPays.length === 0) return 'use-legacy';

		if (mode === 'GROUPED') {
			const pending = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt && this.paymentReadyForPaidStep(p));
			if (!pending.length) return;
			if (groupedPaymentLateUids?.length && lateEntry) {
				const need = new Set(groupedPaymentLateUids);
				const withL = pending.filter((p) => need.has(p.uid)).map((p) => p.uid);
				const withoutL = pending.filter((p) => !need.has(p.uid)).map((p) => p.uid);
				if (withL.length) {
					await this.paymentFirestore.applyPaidToPaymentUids(withL, {
						paidAt: at,
						receiptUrl,
						lateEntry,
						paidLate: true,
					});
				}
				if (withoutL.length) {
					await this.paymentFirestore.applyPaidToPaymentUids(withoutL, {
						paidAt: at,
						receiptUrl,
						paidLate: false,
					});
				}
			} else {
				await this.paymentFirestore.applyPaidToPaymentUids(
					pending.map((p) => p.uid),
					{
						paidAt: at,
						receiptUrl,
						lateEntry,
						paidLate: !!lateEntry,
					},
				);
			}
			return;
		}

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

	/** Corte donde está el estado (puede ser original cuando es diferida). */
	getStateCutDate(s: AdvisorCutSummaryWithState): number {
		const raw = s.state?.cutDate ?? s.cutDate;
		if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
		if (raw != null && typeof raw === 'object' && typeof (raw as { toMillis?: () => number }).toMillis === 'function') {
			return (raw as { toMillis: () => number }).toMillis();
		}
		return s.cutDate;
	}

	/** Chip por comisión: "Trasladada al 7 abr" solo en vista del corte origen. */
	paymentTrasladadaChipLabel(_s: AdvisorCutSummaryWithState, pay: CommissionPayment): string | null {
		return computePaymentTrasladadaChipLabel(_s.cutDate, pay);
	}

	/** Motivos de atraso a nivel asesora+corte del resumen (cabecera; puede mezclar cortes — preferir por línea). */
	getEffectiveLateReasons(s: AdvisorCutSummaryWithState): LateReasonEntry[] {
		const normalized = normalizeLateReasons(s.state?.lateReasons);
		if (normalized.length) return this.sortLateReasonEntriesByFlowOrder(normalized);
		const cutForState = s.state?.cutDate ?? s.cutDate;
		return this.sortLateReasonEntriesByFlowOrder(this.computeAutoLateReasonEntries(s.state, cutForState));
	}

	/** Al menos una comisión pagada con franja “tarde” (cualquier paso fuera de plazo), o flag legacy en estado. */
	/** Solo retraso real en el flujo (pestaña “Pagadas con retraso”). */
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

	/** Acento naranja (fondo/borde “pagada tarde / diferida”). */
	private static stripeIsOrangeForAccent(
		strip: ReturnType<CommissionCutsPage['getPaymentStripStatus']>,
	): boolean {
		return strip === 'paidLate' || strip === 'paidDeferred';
	}

	/**
	 * Si **todo** el resumen está liquidado: el acento sigue primero las filas **Regular**;
	 * si no hay regulares, las **Diferidas**. Si aún hay pendientes, comportamiento previo.
	 */
	summaryHasOrangePaidAccent(s: AdvisorCutSummaryWithState): boolean {
		const pays = this.nonCancelledPaymentsForSummary(s);
		if (pays.length === 0) return false;

		if (s.pendingAmount === 0) {
			const regular = pays.filter((p) => !this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			const deferred = pays.filter((p) => this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			const scope = regular.length > 0 ? regular : deferred;
			return scope.some(
				(p) =>
					(p.paid || p.paidAt) &&
					CommissionCutsPage.stripeIsOrangeForAccent(this.getPaymentStripStatus(s, p)),
			);
		}

		if (s.state?.paidLate) return true;
		for (const p of pays) {
			if (!p.paid && !p.paidAt) continue;
			if (CommissionCutsPage.stripeIsOrangeForAccent(this.getPaymentStripStatus(s, p))) return true;
		}
		return false;
	}

	/** Naranja en borde interno del contrato (misma prioridad regular → diferida si ya está todo pagado). */
	contractGroupHasAnyPaidLateStrip(
		s: AdvisorCutSummaryWithState,
		c: AdvisorCutSummaryWithState['contractBreakdown'][0],
	): boolean {
		const pays = c.payments.filter((p) => !p.cancelled);
		if (pays.length === 0) return false;

		if (c.pendingAmount === 0) {
			const regular = pays.filter((p) => !this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			const deferred = pays.filter((p) => this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			const scope = regular.length > 0 ? regular : deferred;
			return scope.some(
				(p) =>
					(p.paid || p.paidAt) &&
					CommissionCutsPage.stripeIsOrangeForAccent(this.getPaymentStripStatus(s, p)),
			);
		}

		for (const p of pays) {
			if (!p.paid && !p.paidAt) continue;
			if (CommissionCutsPage.stripeIsOrangeForAccent(this.getPaymentStripStatus(s, p))) return true;
		}
		return false;
	}

	private nonCancelledPaymentsForSummary(s: AdvisorCutSummaryWithState): CommissionPayment[] {
		const out: CommissionPayment[] = [];
		for (const c of s.contractBreakdown) {
			for (const p of c.payments) {
				if (!p.cancelled) out.push(p);
			}
		}
		return out;
	}

	private severityFromPaymentStrips(
		s: AdvisorCutSummaryWithState,
		pays: CommissionPayment[],
	): 'danger' | 'warning' | 'success' | 'neutral' {
		if (pays.length === 0) return 'neutral';
		let anyOverdue = false;
		let anyPendingUnpaid = false;
		let anyPaidLate = false;
		let anyPaidOnTime = false;
		for (const pay of pays) {
			const strip = this.getPaymentStripStatus(s, pay);
			if (strip === 'overdue') anyOverdue = true;
			else if (strip === 'pending' || strip === 'deferredPending') anyPendingUnpaid = true;
			else if (strip === 'paidLate' || strip === 'paidDeferred') anyPaidLate = true;
			else anyPaidOnTime = true;
		}
		if (anyOverdue) return 'danger';
		if (anyPendingUnpaid || anyPaidLate) return 'warning';
		if (anyPaidOnTime && !anyPendingUnpaid) return 'success';
		return 'neutral';
	}

	/** Estado agregado en el corte original de la asesora (varias líneas → mismo modelo que la tarjeta). */
	getAdvisorStateForCut(advisorUid: string, cutDate: number): AdvisorWorkflowState | null {
		const relevant = this.latestPaymentsSnapshot.filter(
			(p) => p.advisorUid === advisorUid && !p.cancelled && sameCanonicalCutDate(p.cutDate, cutDate),
		);
		if (!relevant.length) return null;
		return deriveAdvisorWorkflowFromPayments(relevant, cutDate).mergedState;
	}

	/** Timestamps del flujo viven en el doc del pago. */
	private getFlowStateForPayment(_s: AdvisorCutSummaryWithState, pay: CommissionPayment): AdvisorWorkflowState | null {
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

	/** Fechas del flujo para el pie de cada comisión (Desglose / Factura / Pago). */
	paymentFlowStepsForDisplay(pay: CommissionPayment): Array<{ label: string; at?: number }> {
		return [
			{ label: 'Desglose', at: pay.breakdownSentAt },
			{ label: 'Factura', at: pay.invoiceSentAt },
			{ label: 'Enviada a pago', at: pay.sentToPaymentAt },
			{ label: 'Pagada', at: pay.receiptSentAt ?? pay.paidAt },
		];
	}

	/**
	 * Franja por comisión: pagada a tiempo = verde; pagada con algún paso tarde = naranja;
	 * pendiente en plazo = amarillo; diferida en el corte de trabajo (impaga) = naranja;
	 * comisión diferida ya pagada en este corte = naranja; atraso activo = rojo.
	 */
	getPaymentStripStatus(
		s: AdvisorCutSummaryWithState,
		pay: CommissionPayment
	):
		| 'paid'
		| 'paidLate'
		| 'paidDeferred'
		| 'overdue'
		| 'pending'
		| 'deferredPending' {
		if (pay.cancelled) return 'pending';
		if (pay.paid || pay.paidAt) {
			if (this.paymentShowsDeferredOriginInSummary(pay, s.cutDate)) return 'paidDeferred';
			const flowSt = this.getFlowStateForPayment(s, pay);
			return paymentFlowHasAnyLateStep(pay.cutDate, flowSt) ? 'paidLate' : 'paid';
		}
		const st = commissionPaymentToSyntheticAdvisorState(pay);
		const invoiceDeadline = st?.breakdownSentAt
			? getInvoiceDeadline(st.breakdownSentAt)
			: getBreakdownDeadline(pay.cutDate);
		const sentToPaymentDeadline = st?.invoiceSentAt
			? getSentToPaymentDeadline(st.invoiceSentAt)
			: undefined;
		const paymentDeadline = st?.sentToPaymentAt ? getPaymentDeadline(st.sentToPaymentAt) : undefined;
		const invOverdue = invoiceDeadline ? isInvoiceOverdue(st?.invoiceSentAt, invoiceDeadline) : false;
		const sentToPayOverdue = sentToPaymentDeadline
			? isPaymentOverdue(st?.sentToPaymentAt, sentToPaymentDeadline)
			: false;
		const payOverdue = paymentDeadline ? isPaymentOverdue(st?.receiptSentAt, paymentDeadline) : false;
		const hasLate = normalizeLateReasons(st?.lateReasons).length > 0;
		const desgloseOverdueSinEnviar =
			(st?.state === 'PENDING' || !st) &&
			!!invoiceDeadline &&
			isInvoiceOverdue(undefined, invoiceDeadline);
		if (invOverdue || sentToPayOverdue || payOverdue || hasLate || desgloseOverdueSinEnviar) return 'overdue';
		const def = normalizeDeferredToCutStored(pay);
		if (def != null && sameCanonicalCutDate(def, s.cutDate)) return 'deferredPending';
		return 'pending';
	}

	/**
	 * Borde tarjeta asesora: rojo > amarillo/naranja > verde.
	 * Si **todo** está liquidado (`pendingAmount === 0`), la severidad sale solo de filas **Regular**;
	 * si no hay regulares en el resumen, de las **Diferidas**. Con pendientes, cuentan todas.
	 */
	getSummaryCardBorderSeverity(s: AdvisorCutSummaryWithState): 'danger' | 'warning' | 'success' | 'neutral' {
		const pays = this.nonCancelledPaymentsForSummary(s);
		if (pays.length === 0) return 'neutral';
		if (s.pendingAmount === 0) {
			const regular = pays.filter((p) => !this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			const deferred = pays.filter((p) => this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			if (regular.length > 0) return this.severityFromPaymentStrips(s, regular);
			return this.severityFromPaymentStrips(s, deferred);
		}
		return this.severityFromPaymentStrips(s, pays);
	}

	/** Borde bloque contrato: misma regla con `c.pendingAmount === 0` y pagos de ese contrato. */
	getContractGroupBorderSeverity(
		s: AdvisorCutSummaryWithState,
		c: AdvisorCutSummaryWithState['contractBreakdown'][0]
	): 'danger' | 'warning' | 'success' | 'neutral' {
		const pays = c.payments.filter((p) => !p.cancelled);
		if (pays.length === 0) return 'neutral';
		if (c.pendingAmount === 0) {
			const regular = pays.filter((p) => !this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			const deferred = pays.filter((p) => this.paymentShowsDeferredOriginInSummary(p, s.cutDate));
			if (regular.length > 0) return this.severityFromPaymentStrips(s, regular);
			return this.severityFromPaymentStrips(s, deferred);
		}
		return this.severityFromPaymentStrips(s, pays);
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
		if (state === 'INVOICE_RECIVED' && s.sentToPaymentDeadline) return `Envío a pago: hasta ${new Date(s.sentToPaymentDeadline).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		if (state === 'SENT_TO_PAYMENT' && s.paymentDeadline) return `Pago: hasta ${new Date(s.paymentDeadline).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
		if (state === 'PAID') return '—';
		return '—';
	}

	private async promptStepActionDate(message: string): Promise<number | undefined> {
		const defaultDay = toMexicoDateInputValue(Date.now()) ?? '';
		return new Promise((resolve) => {
			void this.alertCtrl
				.create({
					cssClass: 'commission-cuts-action-date-alert',
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
				.then(async (a) => {
					await a.present();
					// UX: abrir selector nativo al tocar cualquier parte del campo, no solo el icono.
					setTimeout(() => {
						const root = document.querySelector('ion-alert.commission-cuts-action-date-alert');
						const input = root?.querySelector('.alert-input') as HTMLInputElement | null;
						const wrapper = root?.querySelector('.alert-input-wrapper') as HTMLElement | null;
						if (!input || !wrapper) return;
						const openNativePicker = () => {
							const withPicker = input as HTMLInputElement & { showPicker?: () => void };
							if (typeof withPicker.showPicker === 'function') withPicker.showPicker();
							else {
								input.focus();
								input.click();
							}
						};
						wrapper.addEventListener('click', openNativePicker);
					}, 0);
				});
		});
	}

	/**
	 * Pide la fecha del informe; solo si confirma (y motivo si aplica) descarga el PDF y marca BREAKDOWN_SENT.
	 */
	async downloadCalculationAndMarkBreakdown(s: AdvisorCutSummaryWithState) {
		const at = await this.promptStepActionDate(
			'¿En qué fecha se envió el informe de cálculo (desglose) a la asesora?'
		);
		if (at === undefined) return;
		const pending = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt);
		const uidsDesgloseLate = pending.filter((p) => this.paymentNeedsDesgloseLateReason(p, at)).map((p) => p.uid);
		const lateSet = new Set(uidsDesgloseLate);
		const uidsDesgloseOnTime = pending.filter((p) => !lateSet.has(p.uid)).map((p) => p.uid);
		let lateEntry: LateReasonEntry | undefined;
		if (uidsDesgloseLate.length > 0) {
			const result = await this.openLateReasonModal(
				'DESGLOSE',
				s,
				'Una o más comisiones superan el plazo de desglose de su corte original. Indica el motivo (solo aplica a esas líneas).'
			);
			if (!result) return;
			lateEntry = { step: 'DESGLOSE', reason: result.reason, text: result.text };
		}
		try {
			await this.withStatusActionLoading('Guardando estatus y generando cálculo...', async () => {
				/** GROUPED (tarjeta asesora): cada línea evalúa plazo según su `cutDate` original. */
				if (uidsDesgloseLate.length) {
					await this.paymentFirestore.applyBreakdownSentToPaymentUids(uidsDesgloseLate, {
						breakdownSentAt: at,
						lateEntry,
					});
				}
				if (uidsDesgloseOnTime.length) {
					await this.paymentFirestore.applyBreakdownSentToPaymentUids(uidsDesgloseOnTime, {
						breakdownSentAt: at,
					});
				}
				this.pdfService.exportAdvisorCutCalculation(s, this.advisorFiscalActivityForSummary(s));
				this.refreshCutData(true);
			});
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
		const pendingInv = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt && p.breakdownSentAt);
		const invoiceUidsRequiringLateReason = pendingInv
			.filter((p) => this.paymentNeedsInvoiceLateReason(s, p, at))
			.map((p) => p.uid);
		let lateEntry: LateReasonEntry | undefined;
		if (invoiceUidsRequiringLateReason.length > 0) {
			const result = await this.openLateReasonModal(
				'FACTURA',
				s,
				'Hay comisiones diferidas o fuera de plazo de factura. Indica el motivo (solo se guarda en las líneas que lo requieren).'
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
			invoiceUidsRequiringLateReason: invoiceUidsRequiringLateReason.length
				? invoiceUidsRequiringLateReason
				: undefined,
			s,
			processingMode: 'GROUPED',
		};
		setTimeout(() => fileInput.click(), 0);
	}

	/**
	 * Para el dropdown (3 puntitos): subir archivo sin pedir fecha ni motivos.
	 * Guardamos `invoiceSentAt` con la hora actual para que el flujo pueda avanzar.
	 */
	beginInvoiceAttachQuick(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement, stateCutDate?: number) {
		const effectiveStateCutDate = stateCutDate ?? this.getStateCutDate(s);
		const at = Date.now();
		this.pendingFileAttach = {
			kind: 'invoice',
			advisorUid: s.advisorUid,
			stateCutDate: effectiveStateCutDate,
			summaryCutDate: s.cutDate,
			at,
			s,
			processingMode: 'GROUPED',
		};
		setTimeout(() => fileInput.click(), 0);
	}

	async beginReceiptAttach(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement, stateCutDate?: number) {
		const effectiveStateCutDate = stateCutDate ?? this.getStateCutDate(s);
		const at = await this.promptStepActionDate('¿En qué fecha se realizó el pago de comisiones?');
		if (at === undefined) return;
		const pendingPay = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt && p.sentToPaymentAt);
		const paymentUidsRequiringLateReason = pendingPay
			.filter((p) => this.paymentNeedsPaymentLateReason(s, p, at))
			.map((p) => p.uid);
		let lateEntry: LateReasonEntry | undefined;
		if (paymentUidsRequiringLateReason.length > 0) {
			const result = await this.openLateReasonModal(
				'PAGO',
				s,
				'Hay comisiones diferidas o fuera de plazo de pago. Indica el motivo (solo se guarda en las líneas que lo requieren).'
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
			paymentUidsRequiringLateReason: paymentUidsRequiringLateReason.length
				? paymentUidsRequiringLateReason
				: undefined,
			s,
			processingMode: 'GROUPED',
		};
		setTimeout(() => fileInput.click(), 0);
	}

	/**
	 * Para el dropdown (3 puntitos): subir archivo sin pedir fecha ni motivos.
	 * Guardamos `receiptSentAt` con la hora actual para que el flujo pueda avanzar.
	 */
	beginReceiptAttachQuick(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement, stateCutDate?: number) {
		const effectiveStateCutDate = stateCutDate ?? this.getStateCutDate(s);
		const at = Date.now();
		this.pendingFileAttach = {
			kind: 'receipt',
			advisorUid: s.advisorUid,
			stateCutDate: effectiveStateCutDate,
			summaryCutDate: s.cutDate,
			at,
			s,
			processingMode: 'GROUPED',
		};
		setTimeout(() => fileInput.click(), 0);
	}

	onInvoiceAttachmentCardClick(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement) {
		const url = s.state?.invoiceUrl;
		if (url) {
			window.open(url, '_blank', 'noopener');
			return;
		}
		this.beginInvoiceAttachQuick(s, fileInput);
	}

	onReceiptAttachmentCardClick(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement) {
		const url = s.state?.receiptUrl;
		if (url) {
			window.open(url, '_blank', 'noopener');
			return;
		}
		this.beginReceiptAttachQuick(s, fileInput);
	}

	runFooterInvoiceAction(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement) {
		this.footerActionsMenuKey = null;
		this.onInvoiceAttachmentCardClick(s, fileInput);
	}

	runFooterReceiptAction(s: AdvisorCutSummaryWithState, fileInput: HTMLInputElement) {
		this.footerActionsMenuKey = null;
		this.onReceiptAttachmentCardClick(s, fileInput);
	}

	runFooterDownloadAction(s: AdvisorCutSummaryWithState) {
		this.footerActionsMenuKey = null;
		this.downloadCalculationOnly(s);
	}

	async markInvoiceStatusOnly(s: AdvisorCutSummaryWithState) {
		const at = await this.promptStepActionDate('¿En qué fecha se recibió la factura de la asesora?');
		if (at === undefined) return;
		const pendingInv = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt && p.breakdownSentAt);
		const invoiceUidsRequiringLateReason = pendingInv
			.filter((p) => this.paymentNeedsInvoiceLateReason(s, p, at))
			.map((p) => p.uid);
		let lateEntry: LateReasonEntry | undefined;
		if (invoiceUidsRequiringLateReason.length > 0) {
			const result = await this.openLateReasonModal(
				'FACTURA',
				s,
				'Hay comisiones diferidas o fuera de plazo de factura. Indica el motivo (solo aplica donde corresponde).'
			);
			if (!result) return;
			lateEntry = { step: 'FACTURA', reason: result.reason, text: result.text };
		}
		await this.withStatusActionLoading('Actualizando estatus de factura...', async () => {
			const groupedInvoiceLate =
				invoiceUidsRequiringLateReason.length > 0 ? invoiceUidsRequiringLateReason : undefined;
			const deferredFlow = await this.applyDeferredCaseInvoiceFlow(
				s,
				at,
				lateEntry,
				undefined,
				'GROUPED',
				groupedInvoiceLate,
			);
			if (deferredFlow !== 'use-legacy') {
				this.refreshCutData(true);
				return;
			}
			const need = new Set(invoiceUidsRequiringLateReason);
			const withL = pendingInv.filter((p) => need.has(p.uid)).map((p) => p.uid);
			const withoutL = pendingInv.filter((p) => !need.has(p.uid)).map((p) => p.uid);
			if (withL.length && lateEntry) {
				await this.paymentFirestore.applyInvoiceSentToPaymentUids(withL, {
					invoiceSentAt: at,
					lateEntry,
				});
			}
			if (withoutL.length) {
				await this.paymentFirestore.applyInvoiceSentToPaymentUids(withoutL, { invoiceSentAt: at });
			}
			this.refreshCutData(true);
		});
	}

	async markSentToPaymentStatusOnly(s: AdvisorCutSummaryWithState) {
		const at = await this.promptStepActionDate('¿En qué fecha se envió la comisión a pago?');
		if (at === undefined) return;
		const pending = s.payments
			.filter((p) => !p.cancelled && !p.paid && !p.paidAt && p.invoiceSentAt && !p.sentToPaymentAt);
		const sentToPaymentUidsRequiringLateReason = pending
			.filter((p) => this.paymentNeedsSentToPaymentLateReason(s, p, at))
			.map((p) => p.uid);
		let lateEntry: LateReasonEntry | undefined;
		if (sentToPaymentUidsRequiringLateReason.length > 0) {
			const result = await this.openLateReasonModal(
				'PAGO',
				s,
				'Hay comisiones diferidas o fuera de plazo de envío a pago. Indica el motivo (solo aplica donde corresponde).'
			);
			if (!result) return;
			lateEntry = { step: 'PAGO', reason: result.reason, text: result.text };
		}
		const need = new Set(sentToPaymentUidsRequiringLateReason);
		const withL = pending.filter((p) => need.has(p.uid)).map((p) => p.uid);
		const withoutL = pending.filter((p) => !need.has(p.uid)).map((p) => p.uid);
		if (withL.length && lateEntry) {
			await this.paymentFirestore.applySentToPaymentToPaymentUids(withL, {
				sentToPaymentAt: at,
				lateEntry,
			});
		}
		if (withoutL.length) {
			await this.paymentFirestore.applySentToPaymentToPaymentUids(withoutL, { sentToPaymentAt: at });
		}
		this.refreshCutData(true);
	}

	async markPaidStatusOnly(s: AdvisorCutSummaryWithState) {
		const at = await this.promptStepActionDate('¿En qué fecha se realizó el pago de comisiones?');
		if (at === undefined) return;
		const pendingPay = s.payments.filter((p) => !p.cancelled && !p.paid && !p.paidAt && this.paymentReadyForPaidStep(p));
		const paymentUidsRequiringLateReason = pendingPay
			.filter((p) => this.paymentNeedsPaymentLateReason(s, p, at))
			.map((p) => p.uid);
		let lateEntry: LateReasonEntry | undefined;
		if (paymentUidsRequiringLateReason.length > 0) {
			const result = await this.openLateReasonModal(
				'PAGO',
				s,
				'Hay comisiones diferidas o fuera de plazo de pago. Indica el motivo (solo aplica donde corresponde).'
			);
			if (!result) return;
			lateEntry = { step: 'PAGO', reason: result.reason, text: result.text };
		}
		await this.withStatusActionLoading('Actualizando estatus a pagada...', async () => {
			const groupedPayLate =
				paymentUidsRequiringLateReason.length > 0 ? paymentUidsRequiringLateReason : undefined;
			const paidDeferred = await this.applyDeferredCaseMarkPaidFlow(
				s,
				at,
				lateEntry,
				undefined,
				'GROUPED',
				groupedPayLate,
			);
			if (paidDeferred !== 'use-legacy') {
				this.refreshCutData(true);
				return;
			}
			const need = new Set(paymentUidsRequiringLateReason);
			const withL = pendingPay.filter((p) => need.has(p.uid)).map((p) => p.uid);
			const withoutL = pendingPay.filter((p) => !need.has(p.uid)).map((p) => p.uid);
			if (withL.length && lateEntry) {
				await this.paymentFirestore.applyPaidToPaymentUids(withL, {
					paidAt: at,
					lateEntry,
					paidLate: true,
				});
			}
			if (withoutL.length) {
				await this.paymentFirestore.applyPaidToPaymentUids(withoutL, { paidAt: at, paidLate: false });
			}
			this.refreshCutData(true);
		});
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
				const procMode = p.processingMode ?? 'GROUPED';
				const defInv = p.s
					? await this.applyDeferredCaseInvoiceFlow(
							p.s,
							at,
							lateEntry,
							invoiceUrl,
							procMode,
							p.invoiceUidsRequiringLateReason,
						)
					: 'use-legacy';
				if (defInv !== 'use-legacy') {
					this.refreshCutData(true);
					return;
				}
				const pendingInv = p.s
					? p.s.payments.filter((x) => !x.cancelled && !x.paid && !x.paidAt && x.breakdownSentAt)
					: [];
				const uids =
					p.s && pendingInv.length
						? pendingInv.map((x) => x.uid)
						: await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, advisorUid, true);
				if (uids.length && p.s && pendingInv.length) {
					const need = new Set(p.invoiceUidsRequiringLateReason ?? []);
					const withL = pendingInv.filter((x) => need.has(x.uid)).map((x) => x.uid);
					const withoutL = pendingInv.filter((x) => !need.has(x.uid)).map((x) => x.uid);
					if (withL.length && lateEntry) {
						await this.paymentFirestore.applyInvoiceSentToPaymentUids(withL, {
							invoiceSentAt: at,
							invoiceUrl,
							lateEntry,
						});
					}
					if (withoutL.length) {
						await this.paymentFirestore.applyInvoiceSentToPaymentUids(withoutL, {
							invoiceSentAt: at,
							invoiceUrl,
						});
					}
				} else if (uids.length) {
					await this.paymentFirestore.applyInvoiceSentToPaymentUids(uids, {
						invoiceSentAt: at,
						invoiceUrl,
						lateEntry,
					});
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
				const procMode = p.processingMode ?? 'GROUPED';
				const defPaid = p.s
					? await this.applyDeferredCaseMarkPaidFlow(
							p.s,
							at,
							lateEntry,
							receiptUrl,
							procMode,
							p.paymentUidsRequiringLateReason,
						)
					: 'use-legacy';
				if (defPaid !== 'use-legacy') {
					this.refreshCutData(true);
					return;
				}
		const pendingPay = p.s
			? p.s.payments.filter((x) => !x.cancelled && !x.paid && !x.paidAt && this.paymentReadyForPaidStep(x))
			: [];
				const uids =
					p.s && pendingPay.length
						? pendingPay.map((x) => x.uid)
						: await this.paymentFirestore.getPaymentUidsForCutAndAdvisor(stateCutDate, advisorUid, true);
				if (uids.length && p.s && pendingPay.length) {
					const need = new Set(p.paymentUidsRequiringLateReason ?? []);
					const withL = pendingPay.filter((x) => need.has(x.uid)).map((x) => x.uid);
					const withoutL = pendingPay.filter((x) => !need.has(x.uid)).map((x) => x.uid);
					if (withL.length && lateEntry) {
						await this.paymentFirestore.applyPaidToPaymentUids(withL, {
							paidAt: at,
							receiptUrl,
							lateEntry,
							paidLate: true,
						});
					}
					if (withoutL.length) {
						await this.paymentFirestore.applyPaidToPaymentUids(withoutL, {
							paidAt: at,
							receiptUrl,
							paidLate: false,
						});
					}
				} else if (uids.length) {
					await this.paymentFirestore.applyPaidToPaymentUids(uids, {
						paidAt: at,
						receiptUrl,
						lateEntry,
						paidLate: !!lateEntry,
					});
				}
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
		const options = LATE_REASON_CODES_BY_STEP[step] ?? [];
		if (!options.length) return undefined;
		return new Promise((resolve) => {
			void this.alertCtrl
				.create({
					cssClass: 'commission-cuts-late-reason-alert',
					header: 'Motivo de atraso',
					message: subtitle ?? `Indica el motivo de atraso para el paso ${step}.`,
					inputs: options.map((code, idx) => ({
						type: 'radio' as const,
						label: COMMISSION_CUT_LATE_REASONS[code] ?? code,
						value: code,
						checked: idx === 0,
					})),
					buttons: [
						{
							text: 'Cancelar',
							role: 'cancel',
							handler: () => resolve(undefined),
						},
						{
							text: 'Continuar',
							handler: (data: unknown) => {
								const root = document.querySelector(
									'ion-alert.commission-cuts-late-reason-alert'
								) as HTMLElement | null;
								const reason = typeof data === 'string' ? data : undefined;
								const textArea = root?.querySelector(
									'textarea.commission-cuts-late-reason-extra-text'
								) as HTMLTextAreaElement | null;
								const text = textArea?.value?.trim() || undefined;
								if (!reason) return false;
								resolve({ reason, text });
								return true;
							},
						},
					],
				})
				.then(async (a) => {
					await a.present();
					// `ion-alert` no soporta bien radio + textarea en `inputs`; inyectamos textarea custom.
					setTimeout(() => {
						const root = document.querySelector(
							'ion-alert.commission-cuts-late-reason-alert'
						) as HTMLElement | null;
						const group = root?.querySelector('.alert-radio-group') as HTMLElement | null;
						if (!root || !group || root.querySelector('.commission-cuts-late-reason-extra-wrap')) return;
						const wrap = document.createElement('div');
						wrap.className = 'commission-cuts-late-reason-extra-wrap';
						wrap.innerHTML =
							'<label class="commission-cuts-late-reason-extra-label">Texto adicional (opcional)</label>' +
							'<textarea class="commission-cuts-late-reason-extra-text" rows="3" placeholder="Explicación adicional..."></textarea>';
						group.insertAdjacentElement('afterend', wrap);
					}, 0);
				});
		});
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
		if (state === 'INVOICE_RECIVED') return ['invoice'];
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

		// Nota: este menú no debe alterar estatus ni fechas, solo ofrecer acciones para adjuntar y/o descargar.
		const buttons: Array<{ text: string; handler: () => void }> = [
			{
				text: 'Descargar cálculo',
				handler: () => {
					this.downloadCalculationOnly(s);
				},
			},
		];

		if (options.includes('invoice')) {
			buttons.push({
				text: 'Subir Factura',
				handler: () => {
					this.beginInvoiceAttachQuick(s, invoiceInput);
				},
			});
		}
		if (options.includes('receipt')) {
			buttons.push({
				text: 'Subir Comprobante',
				handler: () => {
					this.beginReceiptAttachQuick(s, receiptInput);
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

	/** Solo descarga/re-exporta el PDF del cálculo; no pide fecha ni cambia estatus. */
	downloadCalculationOnly(s: AdvisorCutSummaryWithState) {
		this.pdfService.exportAdvisorCutCalculation(s, this.advisorFiscalActivityForSummary(s));
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

	async downloadCutBreakdown(group: CutSummariesGroup) {
		const loading = await this.loadingCtrl.create({
			message: 'Generando archivo Excel…',
			backdropDismiss: false,
		});
		await loading.present();
		try {
			await this.excelExportService.exportCommissionReport(group.cutDate);
		} catch (err) {
			console.error(err);
			const t = await this.toastCtrl.create({
				message: 'No se pudo generar el archivo Excel.',
				duration: 4000,
				color: 'danger',
				position: 'top',
			});
			await t.present();
		} finally {
			await loading.dismiss();
		}
	}
}
