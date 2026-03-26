import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { AdvisorCutSummary } from '../models/commission-cuts-summary.model';
import { CommissionCutAdvisorState } from '../models/commission-cut-state.model';
import { mexicoDateKeyFromTimestamp } from '../domain/time/mexico-time.util';

export type SummaryForPdf = AdvisorCutSummary & { state?: CommissionCutAdvisorState | null };

@Injectable({ providedIn: 'root' })
export class CommissionCutsPdfService {
	/** Exporta resumen general de cortes a PDF. Incluye tipo Regular/Diferida. */
	exportGeneral(summaries: SummaryForPdf[], cutDateLabel?: string): void {
		const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
		const title = cutDateLabel
			? `Cortes de comisión - Corte ${cutDateLabel}`
			: 'Cortes de comisión - Resumen general';
		doc.setFontSize(16);
		doc.text(title, 14, 15);

		const cols = ['Corte', 'Asesora', 'Total', 'Pendiente', 'Pagado', 'Tipo', 'Contratos'];
		const colWidths = [30, 50, 35, 35, 35, 30, 25];
		const startY = 22;
		const rowHeight = 8;

		// Header
		let x = 14;
		doc.setFillColor(66, 66, 66);
		doc.rect(14, startY - 5, colWidths.reduce((a, b) => a + b, 0) + 10, rowHeight, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(9);
		colWidths.forEach((w, i) => {
			doc.text(cols[i], x, startY + 1);
			x += w;
		});

		// Rows
		doc.setTextColor(0, 0, 0);
		let y = startY + rowHeight;
		summaries.forEach((s) => {
			const tipoLabel = s.state?.movedToNextCut || s.state?.originalCutDate ? 'Diferida' : 'Regular';
			const row = [
				new Date(s.cutDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
				s.advisorName,
				this.formatCurrency(s.totalAmount),
				this.formatCurrency(s.pendingAmount),
				this.formatCurrency(s.paidAmount),
				tipoLabel,
				String(s.contractUids.length),
			];
			x = 14;
			colWidths.forEach((w, i) => {
				doc.text(String(row[i] ?? ''), x, y);
				x += w;
			});
			y += rowHeight;
		});

		doc.save(`cortes-comision-${Date.now()}.pdf`);
	}

	/** Exporta resumen por asesora a PDF. Incluye tipo Regular/Diferida por corte. */
	exportByAdvisor(
		advisorName: string,
		summaries: SummaryForPdf[],
		totalAmount: number,
		pendingAmount: number,
		paidAmount: number,
		fileName?: string
	): void {
		const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
		doc.setFontSize(16);
		doc.text(`Comisiones - ${advisorName}`, 14, 15);
		doc.setFontSize(10);
		doc.text(
			`Total: ${this.formatCurrency(totalAmount)} | Pendiente: ${this.formatCurrency(pendingAmount)} | Pagado: ${this.formatCurrency(paidAmount)}`,
			14,
			22
		);

		const cols = ['Corte', 'Monto', 'Desglose'];
		const colWidths = [40, 45, 110];
		const startY = 28;
		const rowHeight = 8;

		doc.setFillColor(66, 66, 66);
		doc.rect(14, startY - 5, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(9);
		let x = 14;
		colWidths.forEach((w, i) => {
			doc.text(cols[i], x, startY + 1);
			x += w;
		});

		doc.setTextColor(0, 0, 0);
		let y = startY + rowHeight;
		summaries.forEach((s) => {
			const tipoLabel = s.state?.movedToNextCut || s.state?.originalCutDate ? 'Diferida' : 'Regular';
			const row = [
				new Date(s.cutDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
				this.formatCurrency(s.totalAmount),
				`${tipoLabel} - ${s.breakdown.map((b) => `${b.paymentType}: ${this.formatCurrency(b.amount)}`).join(', ')}`,
			];
			x = 14;
			colWidths.forEach((w, i) => {
				const text = String(row[i] ?? '');
				doc.text(text.length > 35 ? text.substring(0, 32) + '...' : text, x, y);
				x += w;
			});
			y += rowHeight;
		});

		doc.save(fileName ?? `comision-${advisorName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
	}

	/**
	 * PDF del cálculo para un corte y asesora (paso “Descargar cálculo” / enviar informe).
	 * Misma tabla que export por asesora pero un solo corte.
	 */
	exportAdvisorCutCalculation(s: SummaryForPdf): void {
		const cutKey = mexicoDateKeyFromTimestamp(s.cutDate);
		const safeName = s.advisorName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
		const fileName = `calculo-${safeName}-${cutKey}.pdf`;
		this.exportByAdvisor(s.advisorName, [s], s.totalAmount, s.pendingAmount, s.paidAmount, fileName);
	}

	private formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			minimumFractionDigits: 2,
		}).format(amount);
	}
}
