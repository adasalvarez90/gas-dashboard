import { Contract, ContractStatus } from 'src/app/store/contract/contract.model';

const MEXICO_TZ = 'America/Mexico_City';

/** Día del mes (1–31) en zona horaria de México. */
export function getCalendarDayInMexico(timestampMs: number): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: MEXICO_TZ,
		day: 'numeric',
	}).formatToParts(new Date(timestampMs));
	const dayPart = parts.find((p) => p.type === 'day');
	return dayPart ? parseInt(dayPart.value, 10) : 15;
}

/**
 * Tranche 1 ya fondeado: día 1–15 (México) → "15 del mes"; 16–31 → "Final de mes".
 */
export function computePaymentsAfterTranche1Funded(fundedAtMs: number): string {
	const day = getCalendarDayInMexico(fundedAtMs);
	return day >= 1 && day <= 15 ? '15 del mes' : 'Final de mes';
}

/**
 * Tranche 1 ya fondeado: día 1–15 → "1 o 2 del mes"; 16–31 → "16 o 17 del mes".
 */
export function computeAccountStatusAfterTranche1Funded(fundedAtMs: number): string {
	const day = getCalendarDayInMexico(fundedAtMs);
	return day >= 1 && day <= 15 ? '1 o 2 del mes' : '16 o 17 del mes';
}

/**
 * Sin tranche 1 fondeado (sin startDate) o cancelado → vacíos.
 * Con startDate y activo/finalizado → textos según regla de fondeo.
 */
export function resolvePaymentsAndAccountStatus(contract: {
	contractStatus: ContractStatus;
	startDate?: number;
}): { payments: string; accountStatus: string } {
	if (!contract.startDate || contract.contractStatus === 'CANCELLED') {
		return { payments: '', accountStatus: '' };
	}
	if (contract.contractStatus === 'PENDING') {
		return { payments: '', accountStatus: '' };
	}
	return {
		payments: computePaymentsAfterTranche1Funded(contract.startDate),
		accountStatus: computeAccountStatusAfterTranche1Funded(contract.startDate),
	};
}

export function normalizeContractAccounts(c: Contract): Contract {
	const funding = (c.fundingAccount ?? '').trim();
	const returns = (c.returnsAccount ?? '').trim() || funding;
	return {
		...c,
		fundingAccount: funding,
		returnsAccount: returns,
	};
}

/** Opciones de cuenta origen para depósitos. Incluye siempre "No especificada en el contrato". */
export interface SourceAccountOption {
	value: 'funding' | 'returns' | 'no_especificada';
	label: string;
}

export function getSourceAccountOptions(contract: Contract): SourceAccountOption[] {
	const c = normalizeContractAccounts(contract);
	const opts: SourceAccountOption[] = [
		{ value: 'funding', label: `Cuenta fondeo: ${c.fundingAccount || '(vacía)'}` }
	];
	if (c.returnsAccount && c.returnsAccount !== c.fundingAccount) {
		opts.push({ value: 'returns', label: `Cuenta rendimientos: ${c.returnsAccount}` });
	}
	opts.push({ value: 'no_especificada', label: 'No especificada en el contrato' });
	return opts;
}
