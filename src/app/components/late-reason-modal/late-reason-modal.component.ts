import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import type { LateReasonStep } from 'src/app/models/commission-cut-late-reason.model';
import {
	COMMISSION_CUT_LATE_REASONS,
	LATE_REASON_CODES_BY_STEP,
} from 'src/app/models/commission-cut-late-reason.model';

export interface LateReasonModalResult {
	reason: string;
	text?: string;
}

@Component({
	selector: 'app-late-reason-modal',
	standalone: true,
	templateUrl: './late-reason-modal.component.html',
	styleUrls: ['./late-reason-modal.component.scss'],
	imports: [CommonModule, FormsModule, IonicModule],
})
export class LateReasonModalComponent implements OnInit {
	@Input() step!: LateReasonStep;
	@Input() title?: string;
	@Input() subtitle?: string;

	reason = '';
	text = '';

	readonly COMMISSION_CUT_LATE_REASONS = COMMISSION_CUT_LATE_REASONS;
	readonly LATE_REASON_CODES_BY_STEP = LATE_REASON_CODES_BY_STEP;

	constructor(private modalCtrl: ModalController) {}

	get stepLabels(): Record<LateReasonStep, string> {
		return {
			DESGLOSE: 'Desglose',
			FACTURA: 'Factura',
			PAGO: 'Pago',
		};
	}

	ngOnInit() {
		const codes = this.step ? LATE_REASON_CODES_BY_STEP[this.step] : [];
		if (codes.length === 1) this.reason = codes[0];
	}

	get options(): { value: string; label: string }[] {
		const codes = this.step ? LATE_REASON_CODES_BY_STEP[this.step] : [];
		return codes.map((code) => ({
			value: code,
			label: COMMISSION_CUT_LATE_REASONS[code] ?? code,
		}));
	}

	cancel() {
		this.modalCtrl.dismiss(undefined, 'cancel');
	}

	submit() {
		if (!this.reason?.trim()) return;
		this.modalCtrl.dismiss(
			{ reason: this.reason.trim(), text: this.text?.trim() || undefined } as LateReasonModalResult,
			'ok'
		);
	}
}
