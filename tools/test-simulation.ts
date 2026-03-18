import { CommissionSimulator } from './commission-simulator';

import { Contract } from '../src/app/store/contract/contract.model';
import { Tranche } from '../src/app/store/tranche/tranche.model';
import { CommissionConfig } from '../src/app/store/commission-config/commission-config.model';

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
// MOCK TRANCHE
// ----------------------------

const tranche: Tranche = {

	uid: 'tranche-1',

	contractUid: contract.uid,

	amount: 100000,

	totalDeposited: 100000,

	funded: true,

	fundedAt: Date.now(),

	sequence: 1,

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


// ----------------------------
// RUN SIMULATION
// ----------------------------

const simulator = new CommissionSimulator();

simulator.simulate(
	contract,
	tranche,
	matrix
);