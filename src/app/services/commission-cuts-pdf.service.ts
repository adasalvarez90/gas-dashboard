import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { AdvisorCutSummary } from '../models/commission-cuts-summary.model';
import { CommissionCutAdvisorState } from '../models/commission-cut-state.model';
import { CommissionPayment } from '../store/commission-payment/commission-payment.model';
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

	/**
	 * PDF del cálculo para un corte y asesora (paso “Descargar cálculo” / enviar informe).
	 * Exporta una fila por cada comisión (incluye Regulares + Diferidas) para que
	 * coincida el conteo y totales con lo que el componente muestra en el detalle.
	 */
	exportAdvisorCutCalculation(s: SummaryForPdf): void {
		const payments = (s.payments ?? []).filter((p) => !p.cancelled);
		const totalAmount = payments.reduce((acc, p) => acc + (p.amount ?? 0), 0);
		const pendingAmount = payments.filter((p) => !p.paidAt && !p.paid).reduce((acc, p) => acc + (p.amount ?? 0), 0);
		const paidAmount = payments.filter((p) => !!p.paidAt || p.paid).reduce((acc, p) => acc + (p.amount ?? 0), 0);

		const cutKey = mexicoDateKeyFromTimestamp(s.cutDate);
		const safeName = s.advisorName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
		const fileName = `calculo-${safeName}-${cutKey}.pdf`;

		const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
		doc.setFontSize(16);
		doc.text(`Comisiones - ${s.advisorName}`, 14, 15);
		doc.setFontSize(10);
		doc.text(
			`Total: ${this.formatCurrency(totalAmount)} | Pendiente: ${this.formatCurrency(pendingAmount)} | Pagado: ${this.formatCurrency(paidAmount)}`,
			14,
			22
		);

		const cols = ['Origen', 'Corte orig.', 'Tipo', 'Rol', 'Esquema', 'Monto', 'Estado'];
		const colWidths = [22, 28, 22, 34, 26, 30, 22];
		const startY = 28;
		const rowHeight = 7;

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
		doc.setFontSize(9);
		let y = startY + rowHeight;

		const sorted = [...payments].sort((a, b) => {
			const ca = a.contractUid ?? '';
			const cb = b.contractUid ?? '';
			if (ca !== cb) return ca.localeCompare(cb);
			const da = a.dueDate ?? 0;
			const db = b.dueDate ?? 0;
			if (da !== db) return da - db;
			return (a.installment ?? 0) - (b.installment ?? 0);
		});

		sorted.forEach((p) => {
			const isPaid = !!p.paidAt || !!p.paid;
			const origen = this.paymentShowsDeferredOriginInSummary(p, s.cutDate) ? 'Diferida' : 'Regular';
			const corteOrig = this.paymentRolledIntoSummaryCut(p, s.cutDate) ? this.formatCutDM(p.cutDate) : '—';
			const row = [
				origen,
				corteOrig,
				this.paymentTypeUiLabel(p.paymentType),
				this.roleLabel(p.role),
				this.commissionReasonLabel(p),
				this.formatCurrency(p.amount ?? 0),
				isPaid ? 'Pagada' : 'Pendiente',
			];

			x = 14;
			colWidths.forEach((w, i) => {
				const maxLen = i === 3 ? 12 : 14;
				const text = this.truncate(String(row[i] ?? ''), maxLen);
				doc.text(text, x, y);
				x += w;
			});

			y += rowHeight;
		});

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
