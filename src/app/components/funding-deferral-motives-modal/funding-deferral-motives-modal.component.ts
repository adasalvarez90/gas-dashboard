import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';
import { COMMISSION_CUT_LATE_REASONS, LATE_REASON_CODES_FOR_FUNDING_CAPTURE } from 'src/app/models/commission-cut-late-reason.model';

export type FundingDeferralFormRow = {
	payment: CommissionPayment;
	code: string;
	text: string;
};

@Component({
	selector: 'app-funding-deferral-motives-modal',
	standalone: true,
	imports: [CommonModule, FormsModule, IonicModule],
	templateUrl: './funding-deferral-motives-modal.component.html',
	styleUrls: ['./funding-deferral-motives-modal.component.scss'],
})
export class FundingDeferralMotivesModalComponent implements OnInit {
	@Input({ required: true }) payments!: CommissionPayment[];

	readonly reasonOptions = LATE_REASON_CODES_FOR_FUNDING_CAPTURE.map((value) => ({
		value,
		label: COMMISSION_CUT_LATE_REASONS[value] ?? value,
	}));

	rows: FundingDeferralFormRow[] = [];

	/** Cortes distintos ordenados (para agrupar en UI). */
	cutKeys: number[] = [];

	saving = false;

	constructor(
		private modalCtrl: ModalController,
		private commissionPaymentFS: CommissionPaymentFirestoreService,
		private toastCtrl: ToastController,
	) {}

	ngOnInit() {
		const sorted = [...this.payments].sort((a, b) => a.cutDate - b.cutDate);
		this.rows = sorted.map((p) => ({
			payment: p,
			code: '',
			text: '',
		}));
		this.cutKeys = [...new Set(sorted.map((p) => p.cutDate))].sort((a, b) => a - b);
	}

	rowsForCut(cutDate: number): FundingDeferralFormRow[] {
		return this.rows.filter((r) => r.payment.cutDate === cutDate);
	}

	rowComplete(row: FundingDeferralFormRow): boolean {
		return !!row.code?.trim() && LATE_REASON_CODES_FOR_FUNDING_CAPTURE.includes(row.code.trim());
	}

	allComplete(): boolean {
		return this.rows.length > 0 && this.rows.every((r) => this.rowComplete(r));
	}

	async save() {
		if (!this.allComplete() || this.saving) return;
		this.saving = true;
		try {
			for (const row of this.rows) {
				await this.commissionPaymentFS.updateFundingDeferralReason(
					row.payment.uid,
					row.code.trim(),
					row.text?.trim() ?? '',
				);
			}
			await this.modalCtrl.dismiss({ saved: true }, 'ok');
		} catch (e: any) {
			const t = await this.toastCtrl.create({
				color: 'danger',
				message: e?.message ?? 'No se pudieron guardar los motivos',
				duration: 4000,
			});
			await t.present();
			this.saving = false;
		}
	}
}
