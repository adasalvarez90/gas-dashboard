import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import {
	COMMISSION_CUT_LATE_REASONS,
	LATE_REASON_CODES_BY_STEP,
} from 'src/app/models/commission-cut-late-reason.model';
import { toCanonicalMexicoDateTimestamp } from 'src/app/domain/time/mexico-time.util';

export interface ProcessDeferredResult {
	reason: string;
	text?: string;
	invoiceFile: File;
	receiptFile: File;
	/** Fechas de cada paso (para determinar corte efectivo y si fue a tiempo). */
	breakdownSentAt: number;
	invoiceSentAt: number;
	receiptSentAt: number;
}

@Component({
	selector: 'app-process-deferred-modal',
	standalone: true,
	templateUrl: './process-deferred-modal.component.html',
	styleUrls: ['./process-deferred-modal.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class ProcessDeferredModalComponent {
	@Input() count = 0;
	@Input() totalAmount = 0;
	@Input() deferredCutDate = 0;

	reason = 'PAGO_NO_REALIZADO_A_TIEMPO';
	text = '';
	invoiceFile: File | null = null;
	receiptFile: File | null = null;

	/** Fechas seleccionadas por el usuario (YYYY-MM-DD para input type="date") */
	breakdownDate = '';
	invoiceDate = '';
	receiptDate = '';

	readonly COMMISSION_CUT_LATE_REASONS = COMMISSION_CUT_LATE_REASONS;
	readonly options = LATE_REASON_CODES_BY_STEP['PAGO'].map((code) => ({
		value: code,
		label: COMMISSION_CUT_LATE_REASONS[code] ?? code,
	}));

	constructor(private modalCtrl: ModalController) {}

	ngOnInit() {
		const today = new Date().toISOString().slice(0, 10);
		this.breakdownDate = today;
		this.invoiceDate = today;
		this.receiptDate = today;
	}

	cancel() {
		this.modalCtrl.dismiss(undefined, 'cancel');
	}

	onInvoiceSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		this.invoiceFile = input.files?.[0] ?? null;
	}

	onReceiptSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		this.receiptFile = input.files?.[0] ?? null;
	}

	submit() {
		if (!this.reason?.trim() || !this.invoiceFile || !this.receiptFile) return;
		const breakdownSentAt = toCanonicalMexicoDateTimestamp(this.breakdownDate);
		const invoiceSentAt = toCanonicalMexicoDateTimestamp(this.invoiceDate);
		const receiptSentAt = toCanonicalMexicoDateTimestamp(this.receiptDate);
		if (!breakdownSentAt || !invoiceSentAt || !receiptSentAt) return;
		this.modalCtrl.dismiss(
			{
				reason: this.reason.trim(),
				text: this.text?.trim() || undefined,
				invoiceFile: this.invoiceFile,
				receiptFile: this.receiptFile,
				breakdownSentAt,
				invoiceSentAt,
				receiptSentAt,
			} as ProcessDeferredResult,
			'ok'
		);
	}
}
