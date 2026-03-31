import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { AdvisorCutSummary } from '../models/commission-cuts-summary.model';
import { CommissionCutAdvisorState } from '../models/commission-cut-state.model';
import { CommissionPayment } from '../store/commission-payment/commission-payment.model';
import type { AdvisorFiscalActivity } from '../store/advisor/advisor.model';
import { mexicoDateKeyFromTimestamp } from '../domain/time/mexico-time.util';
import {
	advisorCutSummaryTipoPdfLabel,
	getEffectiveDeferredDisplayCut,
	normalizeDeferredToCutStored,
	sameCanonicalCutDate,
} from '../domain/commission-cut/commission-cut-deadlines.util';
import { paymentWorkflowStateAtCut } from '../domain/commission-cut/commission-payment-workflow.util';

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
			const tipoLabel = advisorCutSummaryTipoPdfLabel(s);
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
			const tipoLabel = advisorCutSummaryTipoPdfLabel(s);
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

	/** PDF de desglose SAT para factura (PFAE/RESICO). */
	exportAdvisorCutCalculation(s: SummaryForPdf, fiscalActivity?: AdvisorFiscalActivity): void {
		const payments = (s.payments ?? []).filter((p) => !p.cancelled);
		const total = payments.reduce((acc, p) => acc + (p.amount ?? 0), 0);

		const IVA_TRASLADADO = 0.16;
		const IVA_RETENIDO = 0.106667;
		const ISR_RETENIDO = 0.0125;
		const isResico = fiscalActivity === 'RESICO';
		const isrRate = isResico ? ISR_RETENIDO : 0;

		const divisor = 1 + IVA_TRASLADADO - IVA_RETENIDO - isrRate;
		const importe = divisor > 0 ? total / divisor : 0;
		const ivaTrasladado = importe * IVA_TRASLADADO;
		const subtotal = importe + ivaTrasladado;
		const ivaRetenido = importe * IVA_RETENIDO;
		const isrRetenido = isResico ? importe * ISR_RETENIDO : 0;
		const totalFinal = subtotal - ivaRetenido - isrRetenido;

		const regimenLabel =
			fiscalActivity === 'PERSONA_FISICA_ACTIVIDAD_EMPRESARIAL'
				? 'PERSONA FISICA CON ACTIVIDAD EMPRESARIAL'
				: fiscalActivity === 'RESICO'
					? 'RESICO'
					: 'SIN REGIMEN';

		const cutKey = mexicoDateKeyFromTimestamp(s.cutDate);
		const safeName = s.advisorName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
		const fileName = `calculo-sat-${safeName}-${cutKey}.pdf`;

		const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
		doc.setFont('helvetica', 'normal');

		let y = 18;
		doc.setFontSize(12);
		doc.text('Corte', 16, y);
		doc.text(new Date(s.cutDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }), 62, y);
		y += 8;
		doc.text('Asesora', 16, y);
		doc.text(s.advisorName, 62, y);
		y += 8;
		doc.text('Regimen Fiscal', 16, y);
		doc.text(regimenLabel, 62, y);
		y += 8;
		doc.text('Comision', 16, y);
		doc.text(this.formatCurrency(total), 62, y);

		y += 16;
		if (isResico) doc.setFillColor(199, 220, 240);
		else doc.setFillColor(245, 206, 175);
		doc.rect(16, y - 6, 178, 12, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(18);
		doc.text('Desglose final', 105, y + 2, { align: 'center' });
		doc.setFont('helvetica', 'normal');

		y += 15;
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(11);
		doc.text('Concepto', 46, y);
		doc.text('Monto', 132, y);
		doc.setFont('helvetica', 'normal');

		y += 9;
		const rows: Array<{ label: string; value: string }> = [
			{ label: 'Importe:', value: this.formatCurrency(importe) },
			{ label: 'Mas IVA (16%):', value: this.formatCurrency(ivaTrasladado) },
			{ label: 'Subtotal:', value: this.formatCurrency(subtotal) },
			{ label: 'Menos Retencion de IVA:', value: this.formatCurrency(ivaRetenido) },
			{ label: 'Menos ISR (10%):', value: isResico ? this.formatCurrency(isrRetenido) : '$ -' },
			{ label: 'Total:', value: this.formatCurrency(totalFinal) },
		];
		for (const r of rows) {
			const isTotal = r.label === 'Total:';
			doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
			doc.setFontSize(12);
			doc.text(r.label, 16, y);
			doc.text(r.value, 132, y);
			y += 9;
		}

		doc.save(fileName);
	}

	private formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			minimumFractionDigits: 2,
		}).format(amount);
	}

	private truncate(text: string, maxLen: number): string {
		if (text.length <= maxLen) return text;
		return text.slice(0, Math.max(0, maxLen - 3)) + '...';
	}

	private formatCutDM(timestamp: number): string {
		const d = new Date(timestamp);
		return `${d.getDate()}/${d.getMonth() + 1}`;
	}

	private effectiveDeferredCut(p: CommissionPayment): number | null {
		return getEffectiveDeferredDisplayCut(p, p.advisorUid, (cd) => paymentWorkflowStateAtCut(p, cd));
	}

	/**
	 * Esta fila es el **segundo** corte (arrastre desde el original).
	 * Solo entonces se muestra “Corte orig.”.
	 */
	private paymentRolledIntoSummaryCut(pay: CommissionPayment, summaryCutDate: number): boolean {
		if (pay.cancelled) return false;

		if (pay.paid || pay.paidAt) {
			const def = normalizeDeferredToCutStored(pay);
			return def != null && sameCanonicalCutDate(def, summaryCutDate) && summaryCutDate > pay.cutDate;
		}

		if (summaryCutDate <= pay.cutDate) return false;
		const second = this.effectiveDeferredCut(pay);
		return second != null && summaryCutDate === second;
	}

	/**
	 * Origen “Diferida”: arrastre al siguiente corte, o en corte original si aplica segundo corte / motivo de fondeo.
	 */
	private paymentShowsDeferredOriginInSummary(pay: CommissionPayment, summaryCutDate: number): boolean {
		if (this.paymentRolledIntoSummaryCut(pay, summaryCutDate)) return true;
		if (pay.cancelled || pay.paid || pay.paidAt) return false;
		if (summaryCutDate !== pay.cutDate) return false;
		if (pay.fundingDeferralReasonCode) return true;
		return this.effectiveDeferredCut(pay) != null;
	}

	private readonly PAYMENT_TYPE_LABELS: Record<string, string> = {
		IMMEDIATE: 'Inmediato',
		RECURRING: 'Recurrente',
		FINAL: 'Final',
		ADJUSTMENT: 'Ajuste',
	};

	/** UI corta: inmediata → Nueva, recurrente → Antigua */
	private paymentTypeUiLabel(type: string): string {
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
				return this.PAYMENT_TYPE_LABELS[type] ?? type;
		}
	}

	private readonly ROLE_LABELS: Record<string, string> = {
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

	private roleLabel(role: string): string {
		if (!role) return '—';
		return this.ROLE_LABELS[role] ?? this.ROLE_LABELS[role.toUpperCase()] ?? role;
	}

	private schemeLabel(scheme: string): string {
		if (!scheme || scheme === '—') return '—';
		const u = scheme.toUpperCase();
		if (u.includes('NEW') || u.includes('NUEV')) return 'Nueva';
		if (u.includes('OLD') || u.includes('VIEJ')) return 'Anterior';
		return scheme;
	}

	private commissionReasonLabel(p: CommissionPayment): string {
		if (p.paymentType === 'ADJUSTMENT' && p.adjustmentReason) return p.adjustmentReason;
		if (p.scheme && p.scheme !== '—') return this.schemeLabel(p.scheme);
		return this.PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType;
	}
}
