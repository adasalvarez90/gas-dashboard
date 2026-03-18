import { ContractLifecycleSimulator } from './contract-lifecycle-simulator';
import { MonthlyCommissionTimeline } from './monthly-commission-timeline';

import { CommissionConfig } from 'src/app/store/commission-config/commission-config.model';
import { Contract } from 'src/app/store/contract/contract.model';

const simulator = new ContractLifecycleSimulator();
const timeline = new MonthlyCommissionTimeline();

// ----------------------------
// MOCK CONTRACT
// ----------------------------

const contract: Contract = {
	uid: 'contract-test',

	investor: 'Test Investor',

	scheme: 'A',
	source: 'COMUNIDAD',

	yieldPercent: 12,
	liquidity: 12,
	term: 12,

	yieldFrequency: 'monthly',
	payments: 'monthly',

	accountStatus: 'ACTIVE',

	email: '',
	investorRfc: 'XAXX010101000',
	domicilio: 'CDMX',
	fundingAccount: '012345678901234567',
	fundingBankInstitution: 'BBVA',
	returnsAccount: '012345678901234567',
	returnsBankInstitution: 'BBVA',

	docs: false,
	docsComments: '',

	signed: true,

	startDate: Date.now(),
	endDate: Date.now() + (12 * 30 * 24 * 60 * 60 * 1000),

	roles: {
		consultant: 'advisor-1',
		kam: 'advisor-2',
		manager: 'advisor-3',
		salesDirector: 'advisor-4',
		operations: 'advisor-5',
		ceo: 'advisor-6'
	},

	contractStatus: 'ACTIVE',
	signatureDate: Date.now(),

	_create: Date.now(),
	_on: true
};

// ----------------------------
// MOCK COMMISSION MATRIX
// ----------------------------

const matrix: CommissionConfig[] = [

	{ uid: 'CONSULTANT|COMUNIDAD', role: 'CONSULTANT', source: 'COMUNIDAD', percentage: 33.25 },
	{ uid: 'KAM|COMUNIDAD', role: 'KAM', source: 'COMUNIDAD', percentage: 5 },
	{ uid: 'MANAGER|COMUNIDAD', role: 'MANAGER', source: 'COMUNIDAD', percentage: 4.75 },
	{ uid: 'SALES_DIRECTION|COMUNIDAD', role: 'SALES_DIRECTION', source: 'COMUNIDAD', percentage: 5.7 },
	{ uid: 'OPERATIONS|COMUNIDAD', role: 'OPERATIONS', source: 'COMUNIDAD', percentage: 2.85 },
	{ uid: 'CEO|COMUNIDAD', role: 'CEO', source: 'COMUNIDAD', percentage: 48.45 }

];

const tranche1 = {
    uid: 't1',
    contractUid: contract.uid,
    amount: 100000,
    totalDeposited: 100000,
    funded: true,
    fundedAt: new Date('2026-01-15').getTime(),
    sequence: 1
};

const tranche2 = {
    uid: 't2',
    contractUid: contract.uid,
    amount: 100000,
    totalDeposited: 100000,
    funded: true,
    fundedAt: new Date('2026-03-15').getTime(),
    sequence: 2
};

const tranche3 = {
    uid: 't3',
    contractUid: contract.uid,
    amount: 50000,
    totalDeposited: 50000,
    funded: true,
    fundedAt: new Date('2026-08-15').getTime(),
    sequence: 3
};


const payments = simulator.simulateContract(
    contract,
    [tranche1, tranche2, tranche3],
    matrix
);

timeline.generateTimeline(payments);