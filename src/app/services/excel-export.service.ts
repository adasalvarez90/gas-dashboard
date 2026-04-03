import { Injectable } from '@angular/core';
import {
	Firestore,
	collection,
	getDocs,
	query,
	where,
	type QueryConstraint,
} from '@angular/fire/firestore';
import { Workbook, type FillPattern, type Worksheet } from 'exceljs';
import type { Advisor } from 'src/app/store/advisor/advisor.model';
import type { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import type { Contract } from 'src/app/store/contract/contract.model';
import type { Deposit } from 'src/app/store/deposit/deposit.model';
import type { Tranche } from 'src/app/store/tranche/tranche.model';
import { deriveAdvisorWorkflowFromPayments } from 'src/app/domain/commission-cut/commission-payment-workflow.util';

type ReportData = {
	contracts: Contract[];
	tranches: Tranche[];
	deposits: Deposit[];
	commissionPayments: CommissionPayment[];
	advisors: Advisor[];
};

type WorkflowState = 'PENDING' | 'BREAKDOWN_SENT' | 'INVOICE_RECIVED' | 'SENT_TO_PAYMENT' | 'PAID' | 'MIXED';
type WorkflowLikeState = {
	state: WorkflowState;
	breakdownSentAt?: number;
	invoiceSentAt?: number;
	sentToPaymentAt?: number;
	receiptSentAt?: number;
	_update?: number;
	paidLate?: boolean;
};

type PagoAsesoraRow = {
	advisorUid: string;
	advisorName: string;
	regimen: string;
	comisionVentas: number;
	comisionGerencia: number;
	comisionReferidora: number;
	comisionOpsDir: number;
	comisionTotal: number;
	facturaAt?: number;
	estatusLabel?: string;
	estatusAt?: number;
	fechaPago?: number;
	notas?: string;
	enviadaAPago?: boolean;
};

type RoleSums = {
	KAM: number;
	CONSULTANT: number;
	MANAGER: number;
	SALES_DIRECTION: number;
	OPERATIONS: number;
	CEO: number;
	REFERRAL: number;
};

@Injectable({ providedIn: 'root' })
export class ExcelExportService {
	constructor(private firestore: Firestore) {}

	async exportCommissionReport(cutDate: number): Promise<void> {
		const data = await this.loadReportData(cutDate);
		const wb = new Workbook();
		wb.creator = 'El Futuro Es Femenino';
		wb.created = new Date();

		this.buildSheetDesglose(wb.addWorksheet('Desglose El Futuro Fem.'), cutDate, data);
		this.buildSheetPagoPorAsesora(wb.addWorksheet('Pago por Asesora'), cutDate, data);

		const buffer = await wb.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		});
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		const fileName = `Desglose ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}.xlsx`;
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(url);
	}

	private async loadReportData(cutDate: number): Promise<ReportData> {
		const nextCutDate = this.getNextCutInSequence(cutDate);
		const [
			contractsSnap,
			tranchesSnap,
			depositsSnap,
			advisorsSnap,
			payCutSnap,
			payDeferredSnap,
		] = await Promise.all([
			this.getCollectionDocs<Contract>('contracts', [where('_on', '==', true)]),
			this.getCollectionDocs<Tranche>('tranches', [where('_on', '==', true)]),
			this.getCollectionDocs<Deposit>('deposits', [where('_on', '==', true)]),
			this.getCollectionDocs<Advisor>('advisors', [where('_on', '==', true)]),
			this.getCollectionDocs<CommissionPayment>('commissionPayments', [
				where('_on', '==', true),
				where('cutDate', '==', cutDate),
			]),
			this.getCollectionDocs<CommissionPayment>('commissionPayments', [
				where('_on', '==', true),
				where('deferredToCutDate', '==', cutDate),
			]),
		]);

		const contracts = contractsSnap;
		const tranches = tranchesSnap;
		const deposits = depositsSnap;
		const advisors = advisorsSnap;

		const paymentsMap = new Map<string, CommissionPayment>();
		for (const p of [...payCutSnap, ...payDeferredSnap]) {
			if (!p.uid) continue;
			paymentsMap.set(p.uid, p);
		}
		const commissionPayments = Array.from(paymentsMap.values()).filter((p) => {
			const c = contracts.find((x) => x.uid === p.contractUid);
			if (c?.contractStatus === 'CANCELLED' && typeof c.cancelledAt === 'number' && p.dueDate > c.cancelledAt) {
				return false;
			}
			return true;
		});

		void nextCutDate;
		return {
			contracts,
			tranches,
			deposits,
			commissionPayments,
			advisors,
		};
	}

	private async getCollectionDocs<T>(collectionName: string, constraints: QueryConstraint[]): Promise<T[]> {
		const ref = collection(this.firestore, collectionName);
		const q = query(ref, ...constraints);
		const snap = await getDocs(q);
		return snap.docs.map((d) => d.data() as T);
	}

	private buildSheetDesglose(ws: Worksheet, cutDate: number, data: ReportData): void {
		const nextCutDate = this.getNextCutInSequence(cutDate);
		const title = 'CONTROL COMISIONES // EL FUTURO ES FEMENINO //';
		const subtitleNuevas = `Comisiones nuevas del ${this.formatDate(cutDate)} al ${this.formatDate(nextCutDate)}`;
		const headers = [
			'Asesora',
			'Inversionista',
			'Fecha',
			'Depósito',
			'Capital MXN',
			'Rendimiento',
			'Esquema',
			'Tipo de red',
			'Kam',
			'Kam Nom',
			'Consultora',
			'Consultora Nom',
			'Gerente',
			'Gerente Nom',
			'Dirección Ventas',
			'DV Nom',
			'Operaciones Accesible',
			'OA Nom',
			'Comisión Ana',
			'Referidor(a)',
			'Referidor(a) Nom',
			'Comisión',
		];
		ws.mergeCells(1, 1, 2, headers.length);
		ws.getCell(1, 1).value = title;
		ws.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
		ws.getCell(1, 1).font = { bold: true, size: 16 };
		ws.getCell(1, 1).fill = this.solidFill('F4CCCC');
		this.paintMergedBorder(ws, 1, 1, headers.length);
		this.paintMergedBorder(ws, 2, 1, headers.length);

		const immediateTitleRow = 3;
		ws.mergeCells(immediateTitleRow, 1, immediateTitleRow, headers.length);
		ws.getCell(immediateTitleRow, 1).value = subtitleNuevas;
		ws.getCell(immediateTitleRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
		ws.getCell(immediateTitleRow, 1).font = { bold: true, size: 11 };
		ws.getCell(immediateTitleRow, 1).fill = this.solidFill('F4CCCC');
		this.paintMergedBorder(ws, immediateTitleRow, 1, headers.length);

		ws.addRow(headers);
		this.paintHeader(ws.getRow(4), '858FB3');

		const advisorName = new Map(data.advisors.map((a) => [a.uid, a.name]));
		const contractMap = new Map(data.contracts.map((c) => [c.uid, c]));
		const tranchesByContract = this.groupBy(data.tranches, (t) => t.contractUid);
		const paymentsByContractTranche = new Map<string, CommissionPayment[]>();
		for (const p of data.commissionPayments) {
			const k = this.compositeContractTrancheKey(p.contractUid, p.trancheUid);
			const arr = paymentsByContractTranche.get(k) ?? [];
			arr.push(p);
			paymentsByContractTranche.set(k, arr);
		}

		let totalImmediateCommission = 0;
		let totalRecurringCommission = 0;
		let totalReferralImmediate = 0;
		let totalReferralRecurring = 0;

		const immediateTypes = new Set(['IMMEDIATE', 'FINAL', 'ADJUSTMENT']);
		const recurringTypes = new Set(['RECURRING']);

		const buildTrancheRow = (contract: Contract, tranche: Tranche, tranchePayments: CommissionPayment[]) => {
			const capital = tranche.amount ?? 0;
			const commissionTotal = tranchePayments.reduce((acc, p) => acc + (p.amount ?? 0), 0);
			const byRole = this.sumPaymentsByRole(tranchePayments);
			const rendimientoPercent = typeof contract.yieldPercent === 'number'
				? contract.yieldPercent / 100
				: '';
			const asesor = advisorName.get(tranchePayments[0]?.advisorUid ?? '') ?? '';
			const kamNom = advisorName.get(contract.roles?.kam ?? '') ?? '';
			const consultoraNom = advisorName.get(contract.roles?.consultant ?? '') ?? '';
			const gerenteNom = advisorName.get(contract.roles?.manager ?? '') ?? '';
			const dvNom = advisorName.get(contract.roles?.salesDirector ?? '') ?? '';
			const oaNom = advisorName.get(contract.roles?.operations ?? '') ?? '';
			const tipoRed = this.sourceLabel(contract.source);
			return [
				asesor,
				contract.investor ?? '',
				contract.signatureDate ? this.formatDate(contract.signatureDate) : '',
				tranche.fundedAt ? this.formatDate(tranche.fundedAt) : '',
				capital,
				rendimientoPercent,
				contract.scheme ?? '',
				tipoRed,
				byRole.KAM,
				kamNom,
				byRole.CONSULTANT,
				consultoraNom,
				byRole.MANAGER,
				gerenteNom,
				byRole.SALES_DIRECTION,
				dvNom,
				byRole.OPERATIONS,
				oaNom,
				byRole.CEO,
				byRole.REFERRAL,
				contract.roles?.referral?.trim() ?? '',
				commissionTotal,
			];
		};

		const immediateKeys = this.sortedTrancheKeysForPaymentTypes(
			data.commissionPayments,
			immediateTypes,
			contractMap,
			tranchesByContract,
		);
		for (const { contractUid, trancheUid } of immediateKeys) {
			const contract = contractMap.get(contractUid);
			const tranche = (tranchesByContract.get(contractUid) ?? []).find((t) => t.uid === trancheUid);
			if (!contract || !tranche) continue;
			const k = this.compositeContractTrancheKey(contractUid, trancheUid);
			const slice = (paymentsByContractTranche.get(k) ?? []).filter((p) =>
				immediateTypes.has((p.paymentType ?? '').toUpperCase()),
			);
			if (slice.length === 0) continue;
			const row = ws.addRow(buildTrancheRow(contract, tranche, slice));
			this.paintDataRowNoFill(row);
			totalImmediateCommission += slice.reduce((acc, p) => acc + (p.amount ?? 0), 0);
			totalReferralImmediate += this.sumReferralAmount(slice);
		}

		const totalImmediateRow = ws.addRow([
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			totalReferralImmediate,
			'Subtotal',
			totalImmediateCommission,
		]);
		this.paintTotalRow(totalImmediateRow, 'BDD6EE');

		ws.addRow([]);

		const recurringTitleRow = ws.addRow(['Comisiones mensuales 5% dividido entre 12 meses']);
		ws.mergeCells(recurringTitleRow.number, 1, recurringTitleRow.number, headers.length);
		ws.getCell(recurringTitleRow.number, 1).alignment = { horizontal: 'center', vertical: 'middle' };
		ws.getCell(recurringTitleRow.number, 1).font = { bold: true, size: 11 };
		ws.getCell(recurringTitleRow.number, 1).fill = this.solidFill('F4CCCC');
		for (let c = 1; c <= headers.length; c++) {
			ws.getCell(recurringTitleRow.number, c).alignment = { horizontal: 'center', vertical: 'middle' };
		}
		this.paintMergedBorder(ws, recurringTitleRow.number, 1, headers.length);

		const recurringHeaderRow = ws.addRow(headers);
		this.paintHeader(recurringHeaderRow, '858FB3');

		const recurringKeys = this.sortedTrancheKeysForPaymentTypes(
			data.commissionPayments,
			recurringTypes,
			contractMap,
			tranchesByContract,
		);
		for (const { contractUid, trancheUid } of recurringKeys) {
			const contract = contractMap.get(contractUid);
			const tranche = (tranchesByContract.get(contractUid) ?? []).find((t) => t.uid === trancheUid);
			if (!contract || !tranche) continue;
			const k = this.compositeContractTrancheKey(contractUid, trancheUid);
			const slice = (paymentsByContractTranche.get(k) ?? []).filter((p) =>
				recurringTypes.has((p.paymentType ?? '').toUpperCase()),
			);
			if (slice.length === 0) continue;
			const row = ws.addRow(buildTrancheRow(contract, tranche, slice));
			this.paintDataRowNoFill(row);
			totalRecurringCommission += slice.reduce((acc, p) => acc + (p.amount ?? 0), 0);
			totalReferralRecurring += this.sumReferralAmount(slice);
		}

		const totalRecurringRow = ws.addRow([
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			totalReferralRecurring,
			'Subtotal',
			totalRecurringCommission,
		]);
		this.paintTotalRow(totalRecurringRow, 'BDD6EE');

		ws.addRow([]);
		const grandTotalRow = ws.addRow([
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			totalReferralImmediate + totalReferralRecurring,
			'Total',
			totalImmediateCommission + totalRecurringCommission,
		]);
		this.paintTotalRow(grandTotalRow, 'D9EAD3');
		this.applyFormatsDesglose(ws);
	}

	private buildSheetPagoPorAsesora(ws: Worksheet, cutDate: number, data: ReportData): void {
		const nextCutDate = this.getNextCutInSequence(cutDate);
		const title = `CONTROL COMISIONES // EL FUTURO ES FEMENINO //`;
		const subtitle = `Comisiones ${this.formatDate(cutDate)} al ${this.formatDate(nextCutDate)}`;
		const headers = [
			'Asesora',
			'Régimen',
			'Comisión Ventas',
			'Comisión gerencia',
			'Comisión referidora',
			'Comisión operaciones y direcciones',
			'Comisión total',
			'Factura',
			'Estatus',
			'Fecha de Pago',
			'Notas',
		];

		ws.mergeCells(1, 1, 2, headers.length);
		ws.getCell(1, 1).value = title;
		ws.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
		ws.getCell(1, 1).font = { bold: true, size: 16 };
		ws.getCell(1, 1).fill = this.solidFill('ECBAC3');
		this.paintMergedBorder(ws, 1, 1, headers.length);
		this.paintMergedBorder(ws, 2, 1, headers.length);

		ws.mergeCells(3, 1, 3, headers.length);
		ws.getCell(3, 1).value = subtitle;
		ws.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle' };
		ws.getCell(3, 1).font = { bold: true, size: 11 };
		ws.getCell(3, 1).fill = this.solidFill('ECBAC3');
		this.paintMergedBorder(ws, 3, 1, headers.length);

		const headerRow = ws.addRow(headers);
		this.paintHeader(headerRow, '858FB3');

		const advisorsByUid = new Map(data.advisors.map((a) => [a.uid, a]));
		const contractsByUid = new Map(data.contracts.map((c) => [c.uid, c]));
		const paymentsByAdvisor = this.groupBy(data.commissionPayments, (p) => p.advisorUid);

		const rows: PagoAsesoraRow[] = Array.from(paymentsByAdvisor.entries()).map(([advisorUid, payments]) => {
			const advisor = advisorsByUid.get(advisorUid);
			const tags = new Set(advisor?.tags ?? []);
			const byRole = this.sumPaymentsByRole(payments);

			const comisionVentas = byRole.CONSULTANT;
			const comisionGerencia = byRole.MANAGER;
			const comisionReferidora = byRole.REFERRAL;
			let comisionOpsDir = 0;
			if (tags.has('KAM')) comisionOpsDir += byRole.KAM;
			if (tags.has('SALES_DIRECTION')) comisionOpsDir += byRole.SALES_DIRECTION;
			if (tags.has('OPERATIONS')) comisionOpsDir += byRole.OPERATIONS;
			if ((advisor?.hierarchyLevel ?? '').toUpperCase() === 'CEO') comisionOpsDir += byRole.CEO;
			const comisionTotal = comisionVentas + comisionGerencia + comisionReferidora + comisionOpsDir;

			const advisorName =
				advisor?.name ??
				(comisionReferidora > 0
					? this.referrerDisplayNameForPayments(payments, contractsByUid, advisorUid)
					: '');

			const { mergedState } = deriveAdvisorWorkflowFromPayments(payments, cutDate);
			const effectiveState = mergedState ?? undefined;
			const effectivePaidLate =
				!!mergedState?.paidLate ||
				payments.some((p) => !!p.paidLate);
			const paidAtFromPayments = payments
				.map((p) => p.paidAt)
				.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
				.sort((a, b) => b - a)[0];

			return {
				advisorUid,
				advisorName,
				regimen: this.regimenLabel(advisor?.fiscalActivity),
				comisionVentas,
				comisionGerencia,
				comisionReferidora,
				comisionOpsDir,
				comisionTotal,
				facturaAt: effectiveState?.invoiceSentAt,
				estatusLabel: effectiveState ? this.stateLabelForSheet(effectiveState.state, effectivePaidLate) : '',
				estatusAt: this.statusDate(effectiveState),
				fechaPago: paidAtFromPayments,
				notas: '',
				enviadaAPago: !!effectiveState?.sentToPaymentAt || !!effectiveState?.receiptSentAt,
			};
		});

		rows.sort((a, b) => {
			const ar = !advisorsByUid.has(a.advisorUid) && a.comisionReferidora > 0 ? 1 : 0;
			const br = !advisorsByUid.has(b.advisorUid) && b.comisionReferidora > 0 ? 1 : 0;
			if (ar !== br) return ar - br;
			return a.advisorName.localeCompare(b.advisorName);
		});
		let total = 0;
		for (const r of rows) {
			total += r.comisionTotal;
			const estatusCellValue = r.estatusLabel
				? (r.estatusLabel === 'Pendiente'
					? 'Pendiente'
					: (r.estatusLabel === 'Pagada' || r.estatusLabel === 'Pagada atrasada')
						? r.estatusLabel
					: `${r.estatusLabel}${r.estatusAt ? ` ${this.formatDate(r.estatusAt)}` : ''}`)
				: '';
			const row = ws.addRow([
				r.advisorName,
				r.regimen,
				r.comisionVentas,
				r.comisionGerencia,
				r.comisionReferidora === 0 ? '' : r.comisionReferidora,
				r.comisionOpsDir,
				r.comisionTotal,
				r.facturaAt ? this.formatDate(r.facturaAt) : '',
				estatusCellValue,
				r.fechaPago ? this.formatDate(r.fechaPago) : '',
				r.notas ?? '',
			]);
			if (r.estatusLabel === 'Pagada atrasada') this.paintDataRow(row, 'FFD966');
			else if (r.estatusLabel === 'Pagada') this.paintDataRow(row, 'C5E0B3');
			else if (r.enviadaAPago) this.paintDataRow(row, 'FFF2CC');
			else this.paintDataRowNoFill(row);
			row.getCell(11).alignment = { wrapText: true, vertical: 'top' };
		}

		ws.addRow([]);
		const totalRow = ws.addRow(['', '', '', '', '', 'Total', total, '', '', '', '']);
		this.paintTotalRow(totalRow, 'BDD6EE');
		this.applyFormatsPagoAsesora(ws);
	}

	private sumPaymentsByRole(payments: CommissionPayment[]): RoleSums {
		const out: RoleSums = {
			KAM: 0,
			CONSULTANT: 0,
			MANAGER: 0,
			SALES_DIRECTION: 0,
			OPERATIONS: 0,
			CEO: 0,
			REFERRAL: 0,
		};
		for (const p of payments) {
			const role = (p.role ?? '').toUpperCase();
			const amount = p.amount ?? 0;
			if (role === 'REFERRAL') {
				out.REFERRAL += amount;
				continue;
			}
			if (role in out) out[role as keyof RoleSums] += amount;
		}
		return out;
	}

	private sumReferralAmount(payments: CommissionPayment[]): number {
		return payments
			.filter((p) => p.role?.toUpperCase() === 'REFERRAL')
			.reduce((acc, p) => acc + (p.amount ?? 0), 0);
	}

	/** Nombre en hoja 2: coincide con `contracts.roles.referral` si aplica al uid del pago. */
	private referrerDisplayNameForPayments(
		payments: CommissionPayment[],
		contractsByUid: Map<string, Contract>,
		advisorUid: string,
	): string {
		const key = advisorUid.trim();
		for (const p of payments) {
			if (p.role?.toUpperCase() !== 'REFERRAL') continue;
			const ref = contractsByUid.get(p.contractUid ?? '')?.roles?.referral?.trim();
			if (ref && ref === key) return ref;
		}
		return key;
	}

	private paintHeader(row: import('exceljs').Row, colorHex: string): void {
		row.font = { bold: true, size: 11 };
		row.eachCell((cell) => {
			cell.fill = this.solidFill(colorHex);
			cell.alignment = { horizontal: 'center', vertical: 'middle' };
			cell.border = this.thinBorder();
		});
	}

	private paintDataRow(row: import('exceljs').Row, colorHex: string): void {
		row.eachCell((cell) => {
			cell.fill = this.solidFill(colorHex);
			cell.border = this.thinBorder();
			cell.font = { size: 11 };
			if (!cell.alignment) cell.alignment = { vertical: 'middle' };
		});
	}

	private paintDataRowNoFill(row: import('exceljs').Row): void {
		row.eachCell((cell) => {
			cell.border = this.thinBorder();
			cell.fill = this.solidFill('FFFFFF');
			cell.font = { size: 11 };
			if (!cell.alignment) cell.alignment = { vertical: 'middle' };
		});
	}

	private paintTotalRow(row: import('exceljs').Row, colorHex: string): void {
		row.font = { bold: true, size: 11 };
		row.eachCell((cell) => {
			cell.fill = this.solidFill(colorHex);
			cell.border = this.thinBorder();
		});
	}

	private applyFormatsDesglose(ws: Worksheet): void {
		ws.columns = [
			{ width: 18 }, { width: 24 }, { width: 13 }, { width: 13 }, { width: 14 }, { width: 11 }, { width: 10 },
			{ width: 15 }, { width: 10 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 11 }, { width: 16 },
			{ width: 14 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 18 },
			{ width: 20 }, { width: 14 },
		];
		ws.views = [{ state: 'frozen', ySplit: 4 }];
		for (let i = 5; i <= ws.rowCount; i++) {
			// Firma, Depósito, Rendimiento, Esquema, Tipo de red
			for (const col of [3, 4, 6, 7, 8]) {
				ws.getCell(i, col).alignment = { horizontal: 'center', vertical: 'middle' };
			}
			if (typeof ws.getCell(i, 5).value === 'number') ws.getCell(i, 5).numFmt = '$ #,##0.00';
			if (typeof ws.getCell(i, 6).value === 'number') ws.getCell(i, 6).numFmt = '0%';
			for (const col of [9, 11, 13, 15, 17, 19, 20, 22]) {
				if (typeof ws.getCell(i, col).value === 'number') ws.getCell(i, col).numFmt = '$ #,##0.00';
			}
			for (const col of [5, 9, 11, 13, 15, 17, 19, 20, 22]) {
				if (typeof ws.getCell(i, col).value === 'number') {
					ws.getCell(i, col).alignment = { horizontal: 'right', vertical: 'middle' };
				}
			}
		}
		this.autoFitColumnsFromHeader(ws, 4, 10, 40);
	}

	private applyFormatsPagoAsesora(ws: Worksheet): void {
		ws.columns = [
			{ width: 24 }, { width: 16 }, { width: 15 }, { width: 15 }, { width: 16 }, { width: 26 },
			{ width: 15 }, { width: 12 }, { width: 32 }, { width: 14 }, { width: 40 },
		];
		ws.views = [{ state: 'frozen', ySplit: 4 }];
		for (let i = 5; i <= ws.rowCount; i++) {
			// Régimen, Factura, Estatus, Fecha de Pago
			for (const col of [2, 8, 9, 10]) {
				ws.getCell(i, col).alignment = { horizontal: 'center', vertical: 'middle' };
			}
			ws.getCell(i, 3).numFmt = '$ #,##0.00';
			ws.getCell(i, 4).numFmt = '$ #,##0.00';
			ws.getCell(i, 5).numFmt = '$ #,##0.00';
			ws.getCell(i, 6).numFmt = '$ #,##0.00';
			ws.getCell(i, 7).numFmt = '$ #,##0.00';
			for (const col of [3, 4, 5, 6, 7]) {
				ws.getCell(i, col).alignment = { horizontal: 'right', vertical: 'middle' };
			}
		}
		this.autoFitColumnsFromHeader(ws, 4, 10, 40);
	}

	private autoFitColumnsFromHeader(ws: Worksheet, headerRow = 1, minWidth = 10, maxWidth = 40): void {
		for (let col = 1; col <= ws.columnCount; col++) {
			const cell = ws.getCell(headerRow, col);
			const value = cell.value;
			let text = '';
			if (value == null) {
				text = '';
			} else if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
				text = value.richText.map((x) => x.text ?? '').join('');
			} else if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
				text = value.text;
			} else {
				text = String(value);
			}
			const maxLen = text.split(/\r?\n/).reduce((m, line) => Math.max(m, line.length), 0);
			// Extra padding horizontal amplio para headers (aprox. 10px).
			const target = Math.max(minWidth, Math.min(maxWidth, maxLen + 10));
			ws.getColumn(col).width = target;
		}
	}

	private paintMergedBorder(ws: Worksheet, row: number, startCol: number, endCol: number): void {
		for (let c = startCol; c <= endCol; c++) {
			ws.getCell(row, c).border = this.thinBorder();
		}
	}

	private sourceLabel(source?: Contract['source']): string {
		switch ((source ?? '').toUpperCase()) {
			case 'COMUNIDAD':
				return 'Comunidad';
			case 'RED_CALIDA':
				return 'Red cálida';
			case 'DINERO_PROPIO':
				return 'Dinero propio';
			case 'REFERIDORA':
				return 'Referidora';
			default:
				return source ?? '';
		}
	}

	private regimenLabel(v?: Advisor['fiscalActivity']): string {
		if (v === 'RESICO') return 'Resico';
		if (v === 'PERSONA_FISICA_ACTIVIDAD_EMPRESARIAL') return 'PF Act. Emp.';
		return '';
	}

	private stateLabel(state: WorkflowState): string {
		switch (state) {
			case 'PENDING':
				return 'Pendiente';
			case 'BREAKDOWN_SENT':
				return 'Desglose descargado';
			case 'INVOICE_RECIVED':
				return 'Factura recibida';
			case 'SENT_TO_PAYMENT':
				return 'Enviada a pago';
			case 'PAID':
				return 'Pagada';
			case 'MIXED':
				return 'En proceso (varias líneas)';
			default:
				return state;
		}
	}

	private stateLabelForSheet(state: WorkflowState, paidLate: boolean): string {
		if (state === 'PAID' && paidLate) return 'Pagada atrasada';
		return this.stateLabel(state);
	}

	private statusDate(state?: WorkflowLikeState): number | undefined {
		if (!state) return undefined;
		switch (state.state) {
			case 'BREAKDOWN_SENT':
				return state.breakdownSentAt;
			case 'INVOICE_RECIVED':
				return state.invoiceSentAt;
			case 'SENT_TO_PAYMENT':
				return state.sentToPaymentAt ?? state._update;
			case 'PAID':
				return state.receiptSentAt;
			default:
				return state._update;
		}
	}

	private solidFill(colorHex: string): FillPattern {
		return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${colorHex}` } };
	}

	private thinBorder() {
		return {
			top: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
			left: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
			bottom: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
			right: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
		};
	}

	private formatDate(ts: number): string {
		const d = new Date(ts);
		const dd = String(d.getDate()).padStart(2, '0');
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const yyyy = d.getFullYear();
		return `${dd}/${mm}/${yyyy}`;
	}

	private getNextCutInSequence(cutDate: number): number {
		const d = new Date(cutDate);
		const day = d.getDate();
		if (day === 7) return new Date(d.getFullYear(), d.getMonth(), 21, 12, 0, 0, 0).getTime();
		return new Date(d.getFullYear(), d.getMonth() + 1, 7, 12, 0, 0, 0).getTime();
	}

	/** Composite key for grouping payments by contract + tranche (UIDs must not contain U+001E). */
	private compositeContractTrancheKey(contractUid: string, trancheUid: string): string {
		return `${contractUid}\x1e${trancheUid}`;
	}

	private sortedTrancheKeysForPaymentTypes(
		commissionPayments: CommissionPayment[],
		typeSet: Set<string>,
		contractMap: Map<string, Contract>,
		tranchesByContract: Map<string, Tranche[]>,
	): Array<{ contractUid: string; trancheUid: string }> {
		const keySet = new Set<string>();
		for (const p of commissionPayments) {
			if (!typeSet.has((p.paymentType ?? '').toUpperCase())) continue;
			if (!p.contractUid || !p.trancheUid) continue;
			keySet.add(this.compositeContractTrancheKey(p.contractUid, p.trancheUid));
		}
		const rows: Array<{ contractUid: string; trancheUid: string; contract: Contract; tranche: Tranche }> = [];
		for (const key of keySet) {
			const sep = key.indexOf('\x1e');
			if (sep < 0) continue;
			const contractUid = key.slice(0, sep);
			const trancheUid = key.slice(sep + 1);
			const contract = contractMap.get(contractUid);
			const tranche = (tranchesByContract.get(contractUid) ?? []).find((t) => t.uid === trancheUid);
			if (!contract || !tranche) continue;
			rows.push({ contractUid, trancheUid, contract, tranche });
		}
		rows.sort((a, b) => {
			const inv = (a.contract.investor ?? '').localeCompare(b.contract.investor ?? '');
			if (inv !== 0) return inv;
			const seq = (a.tranche.sequence ?? 0) - (b.tranche.sequence ?? 0);
			if (seq !== 0) return seq;
			return a.trancheUid.localeCompare(b.trancheUid);
		});
		return rows.map(({ contractUid, trancheUid }) => ({ contractUid, trancheUid }));
	}

	private groupBy<T>(arr: T[], keyFn: (v: T) => string): Map<string, T[]> {
		const out = new Map<string, T[]>();
		for (const item of arr) {
			const key = keyFn(item);
			const list = out.get(key) ?? [];
			list.push(item);
			out.set(key, list);
		}
		return out;
	}
}

