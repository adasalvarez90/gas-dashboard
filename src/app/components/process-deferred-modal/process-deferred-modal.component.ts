import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import {
	COMMISSION_CUT_LATE_REASONS,
	LATE_REASON_CODES_BY_STEP,
} from 'src/app/models/commission-cut-late-reason.model';
import {
	toCanonicalMexicoDateTimestamp,
	isAfterMexicoDate,
} from 'src/app/domain/time/mexico-time.util';
import {
	getBreakdownDeadline,
	getInvoiceDeadline,
	getPaymentDeadline,
} from 'src/app/domain/commission-cut/commission-cut-deadlines.util';

/** Grupo por corte de origen (Path 2). */
export interface ProcessDeferredModalGroupInput {
	originalCutDate: number;
	paymentUids: string[];
	count: number;
	amount: number;
}

export interface ProcessDeferredGroupFormResult {
	originalCutDate: number;
	paymentUids: string[];
	breakdownSentAt: number;
	invoiceSentAt: number;
	receiptSentAt: number;
	invoiceFile?: File;
	receiptFile?: File;
	breakdownLate: boolean;
	invoiceLate: boolean;
	paymentLate: boolean;
}

export interface ProcessDeferredMotivoPack {
	reason: string;
	text?: string;
}

export interface ProcessDeferredResult {
	groups: ProcessDeferredGroupFormResult[];
	motivoDesglose?: ProcessDeferredMotivoPack;
	motivoFactura?: ProcessDeferredMotivoPack;
	motivoPago?: ProcessDeferredMotivoPack;
}

interface GroupFormRow {
	originalCutDate: number;
	paymentUids: string[];
	count: number;
	amount: number;
	breakdownDate: string;
	invoiceDate: string;
	receiptDate: string;
	invoiceFile: File | null;
	receiptFile: File | null;
}

@Component({
	selector: 'app-process-deferred-modal',
	standalone: true,
	templateUrl: './process-deferred-modal.component.html',
	styleUrls: ['./process-deferred-modal.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class ProcessDeferredModalComponent implements OnInit {
	@Input() groups: ProcessDeferredModalGroupInput[] = [];
	@Input() totalCount = 0;
	@Input() totalAmount = 0;
	@Input() deferredCutDate = 0;

	rows: GroupFormRow[] = [];

	motivoDesgloseReason = '';
	motivoDesgloseText = '';
	motivoFacturaReason = '';
	motivoFacturaText = '';
	motivoPagoReason = '';
	motivoPagoText = '';

	readonly COMMISSION_CUT_LATE_REASONS = COMMISSION_CUT_LATE_REASONS;
	readonly optionsDesglose = LATE_REASON_CODES_BY_STEP['DESGLOSE'].map((code) => ({
		value: code,
		label: COMMISSION_CUT_LATE_REASONS[code] ?? code,
	}));
	readonly optionsFactura = LATE_REASON_CODES_BY_STEP['FACTURA'].map((code) => ({
		value: code,
		label: COMMISSION_CUT_LATE_REASONS[code] ?? code,
	}));
	readonly optionsPago = LATE_REASON_CODES_BY_STEP['PAGO'].map((code) => ({
		value: code,
		label: COMMISSION_CUT_LATE_REASONS[code] ?? code,
	}));

	constructor(private modalCtrl: ModalController) {}

	ngOnInit() {
		const today = new Date().toISOString().slice(0, 10);
		const sorted = [...(this.groups ?? [])].sort((a, b) => a.originalCutDate - b.originalCutDate);
		this.rows = sorted.map((g) => ({
			originalCutDate: g.originalCutDate,
			paymentUids: [...g.paymentUids],
			count: g.count,
			amount: g.amount,
			breakdownDate: today,
			invoiceDate: today,
			receiptDate: today,
			invoiceFile: null,
			receiptFile: null,
		}));
	}

	cancel() {
		this.modalCtrl.dismiss(undefined, 'cancel');
	}

	rowBreakdownLate(row: GroupFormRow): boolean {
		const bd = toCanonicalMexicoDateTimestamp(row.breakdownDate);
		if (!bd) return false;
		return isAfterMexicoDate(bd, getBreakdownDeadline(row.originalCutDate));
	}

	rowInvoiceLate(row: GroupFormRow): boolean {
		const bd = toCanonicalMexicoDateTimestamp(row.breakdownDate);
		const inv = toCanonicalMexicoDateTimestamp(row.invoiceDate);
		if (!bd || !inv) return false;
		return isAfterMexicoDate(inv, getInvoiceDeadline(bd));
	}

	rowPaymentLate(row: GroupFormRow): boolean {
		const inv = toCanonicalMexicoDateTimestamp(row.invoiceDate);
		const rec = toCanonicalMexicoDateTimestamp(row.receiptDate);
		if (!inv || !rec) return false;
		return isAfterMexicoDate(rec, getPaymentDeadline(inv));
	}

	/** Algún paso del flujo (con fechas ya evaluables) va fuera de plazo. */
	rowAnyLate(row: GroupFormRow): boolean {
		return this.rowBreakdownLate(row) || this.rowInvoiceLate(row) || this.rowPaymentLate(row);
	}

	anyDesgloseLate(): boolean {
		return this.rows.some((r) => this.rowBreakdownLate(r));
	}

	anyFacturaLate(): boolean {
		return this.rows.some((r) => this.rowInvoiceLate(r));
	}

	anyPagoLate(): boolean {
		return this.rows.some((r) => this.rowPaymentLate(r));
	}

	rowComplete(row: GroupFormRow): boolean {
		return !!(
			row.breakdownDate &&
			row.invoiceDate &&
			row.receiptDate &&
			toCanonicalMexicoDateTimestamp(row.breakdownDate) &&
			toCanonicalMexicoDateTimestamp(row.invoiceDate) &&
			toCanonicalMexicoDateTimestamp(row.receiptDate)
		);
	}

	allGroupsComplete(): boolean {
		return this.rows.length > 0 && this.rows.every((r) => this.rowComplete(r));
	}

	motivosComplete(): boolean {
		if (this.anyDesgloseLate() && !this.motivoDesgloseReason?.trim()) return false;
		if (this.anyFacturaLate() && !this.motivoFacturaReason?.trim()) return false;
		if (this.anyPagoLate() && !this.motivoPagoReason?.trim()) return false;
		return true;
	}

	canSubmit(): boolean {
		return this.allGroupsComplete() && this.motivosComplete();
	}

	onInvoiceSelected(row: GroupFormRow, e: Event) {
		const input = e.target as HTMLInputElement;
		row.invoiceFile = input.files?.[0] ?? null;
	}

	onReceiptSelected(row: GroupFormRow, e: Event) {
		const input = e.target as HTMLInputElement;
		row.receiptFile = input.files?.[0] ?? null;
	}

	submit() {
		if (!this.canSubmit()) return;
		const groups: ProcessDeferredGroupFormResult[] = [];
		for (const row of this.rows) {
			const breakdownSentAt = toCanonicalMexicoDateTimestamp(row.breakdownDate)!;
			const invoiceSentAt = toCanonicalMexicoDateTimestamp(row.invoiceDate)!;
			const receiptSentAt = toCanonicalMexicoDateTimestamp(row.receiptDate)!;
			groups.push({
				originalCutDate: row.originalCutDate,
				paymentUids: row.paymentUids,
				breakdownSentAt,
				invoiceSentAt,
				receiptSentAt,
				...(row.invoiceFile ? { invoiceFile: row.invoiceFile } : {}),
				...(row.receiptFile ? { receiptFile: row.receiptFile } : {}),
				breakdownLate: this.rowBreakdownLate(row),
				invoiceLate: this.rowInvoiceLate(row),
				paymentLate: this.rowPaymentLate(row),
			});
		}
		const result: ProcessDeferredResult = { groups };
		if (this.anyDesgloseLate()) {
			result.motivoDesglose = {
				reason: this.motivoDesgloseReason.trim(),
				text: this.motivoDesgloseText?.trim() || undefined,
			};
		}
		if (this.anyFacturaLate()) {
			result.motivoFactura = {
				reason: this.motivoFacturaReason.trim(),
				text: this.motivoFacturaText?.trim() || undefined,
			};
		}
		if (this.anyPagoLate()) {
			result.motivoPago = {
				reason: this.motivoPagoReason.trim(),
				text: this.motivoPagoText?.trim() || undefined,
			};
		}
		this.modalCtrl.dismiss(result, 'ok');
	}
}
