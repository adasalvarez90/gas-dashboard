import { TestBed } from '@angular/core/testing';
import { CommissionEngineService } from './commission-engine.service';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionRoleSplit } from 'src/app/models/commission-engine.model';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';

function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate()).getTime();
}

describe('CommissionEngineService', () => {
  let service: CommissionEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommissionEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Scheme A - initial tranche', () => {
    it('generates 12 recurring installments for sequence 1', () => {
      const startDate = new Date(2026, 0, 15).getTime(); // Jan 15 2026
      const endDate = addMonths(startDate, 12);

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate
      };
      const tranche: Partial<Tranche> = {
        uid: 't1',
        contractUid: 'c1',
        amount: 100000,
        sequence: 1,
        fundedAt: startDate
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const recurring = drafts.filter(d => d.paymentType === 'RECURRING');
      expect(recurring).toHaveSize(12);
    });

    it('sum of recurring installments equals recurringTotal (rounding)', () => {
      const startDate = new Date(2026, 0, 15).getTime();
      const endDate = addMonths(startDate, 12);

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate
      };
      const tranche: Partial<Tranche> = {
        uid: 't1',
        contractUid: 'c1',
        amount: 100000,
        sequence: 1,
        fundedAt: startDate
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const recurring = drafts.filter(d => d.paymentType === 'RECURRING');
      const sum = recurring.reduce((acc, d) => acc + d.amount, 0);
      const expectedRecurringTotal = 100000 * 0.05 * 1; // 5% * 100% = 5,000
      expect(Math.abs(sum - expectedRecurringTotal)).toBeLessThan(0.01);
    });
  });

  describe('Scheme A - annex tranche', () => {
    it('generates N recurring installments = remaining months to endDate', () => {
      const startDate = new Date(2026, 0, 15).getTime(); // Jan 15 2026
      const endDate = addMonths(startDate, 12);
      const annexFundedAt = addMonths(startDate, 2); // Mar 15 2026 (month 3 of contract)

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate
      };
      const tranche: Partial<Tranche> = {
        uid: 't2',
        contractUid: 'c1',
        amount: 100000,
        sequence: 2,
        fundedAt: annexFundedAt
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const recurring = drafts.filter(d => d.paymentType === 'RECURRING');
      // Annex in month 3 → remaining: Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan = 10 months
      expect(recurring).toHaveSize(10);
    });

    it('annex recurring sum equals recurringTotal (rounding)', () => {
      const startDate = new Date(2026, 0, 15).getTime();
      const endDate = addMonths(startDate, 12);
      const annexFundedAt = addMonths(startDate, 2);

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate
      };
      const tranche: Partial<Tranche> = {
        uid: 't2',
        contractUid: 'c1',
        amount: 100000,
        sequence: 2,
        fundedAt: annexFundedAt
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const recurring = drafts.filter((d) => d.paymentType === 'RECURRING');
      const sum = recurring.reduce((acc, d) => acc + d.amount, 0);
      const expectedRecurringTotal = 100000 * 0.05 * 1; // 5,000
      expect(Math.abs(sum - expectedRecurringTotal)).toBeLessThan(0.01);
    });

    it('annex in month 4 generates 9 recurring installments (May to Jan)', () => {
      const startDate = new Date(2026, 0, 15).getTime(); // Jan 15 2026
      const endDate = addMonths(startDate, 12); // Jan 15 2027
      const annexFundedAt = addMonths(startDate, 3); // Apr 15 2026 (month 4)

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate
      };
      const tranche: Partial<Tranche> = {
        uid: 't2',
        contractUid: 'c1',
        amount: 100000,
        sequence: 2,
        fundedAt: annexFundedAt
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const recurring = drafts.filter((d) => d.paymentType === 'RECURRING');
      expect(recurring).toHaveSize(9);
    });

    it('annex in month 11 generates 2 recurring installments (Dec and Jan)', () => {
      const startDate = new Date(2026, 0, 15).getTime(); // Jan 15 2026
      const endDate = addMonths(startDate, 12); // Jan 15 2027
      const annexFundedAt = addMonths(startDate, 10); // Nov 15 2026 (month 11 → 2 months left)

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate
      };
      const tranche: Partial<Tranche> = {
        uid: 't2',
        contractUid: 'c1',
        amount: 100000,
        sequence: 2,
        fundedAt: annexFundedAt
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const recurring = drafts.filter((d) => d.paymentType === 'RECURRING');
      expect(recurring).toHaveSize(2);
    });
  });

  describe('Scheme B', () => {
    it('initial tranche: 4% immediate + FINAL (extra by yield) at month 6 of contract', () => {
      const startDate = new Date(2026, 0, 15).getTime();
      const endDate = addMonths(startDate, 12);

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'B',
        source: 'COMUNIDAD',
        startDate,
        endDate,
        yieldPercent: 16
      };
      const tranche: Partial<Tranche> = {
        uid: 't1',
        contractUid: 'c1',
        amount: 100000,
        sequence: 1,
        fundedAt: startDate
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const immediate = drafts.filter((d) => d.paymentType === 'IMMEDIATE');
      const finalPayments = drafts.filter((d) => d.paymentType === 'FINAL');
      expect(immediate).toHaveSize(1);
      expect(immediate[0].amount).toBe(4000); // 4% of 100000
      expect(finalPayments).toHaveSize(1);
      expect(finalPayments[0].amount).toBe(4000); // 4% extra (yield 16%) of 100000
      const due = new Date(finalPayments[0].dueDate);
      expect(due.getUTCDate()).toBe(15);
      expect(due.getUTCMonth()).toBe(6);
      expect(due.getUTCFullYear()).toBe(2026);
    });

    it('annex before month 6: FINAL due at month 6 of contract', () => {
      const startDate = new Date(2026, 0, 15).getTime();
      const endDate = addMonths(startDate, 12);
      const annexFundedAt = addMonths(startDate, 2); // Mar = before month 6

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'B',
        source: 'COMUNIDAD',
        startDate,
        endDate,
        yieldPercent: 16
      };
      const tranche: Partial<Tranche> = {
        uid: 't2',
        contractUid: 'c1',
        amount: 100000,
        sequence: 2,
        fundedAt: annexFundedAt
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const finalPayments = drafts.filter((d) => d.paymentType === 'FINAL');
      expect(finalPayments).toHaveSize(1);
      const due = new Date(finalPayments[0].dueDate);
      expect(due.getUTCDate()).toBe(15);
      expect(due.getUTCMonth()).toBe(6);
      expect(due.getUTCFullYear()).toBe(2026);
    });

    it('annex from month 6 onward: FINAL due at month 12 of contract', () => {
      const startDate = Date.UTC(2026, 0, 15, 12, 0, 0, 0);
      const endDate = Date.UTC(2027, 0, 15, 12, 0, 0, 0);
      const annexFundedAt = Date.UTC(2026, 6, 15, 12, 0, 0, 0);

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'B',
        source: 'COMUNIDAD',
        startDate,
        endDate,
        yieldPercent: 16
      };
      const tranche: Partial<Tranche> = {
        uid: 't2',
        contractUid: 'c1',
        amount: 100000,
        sequence: 2,
        fundedAt: annexFundedAt
      };
      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits
      );

      const finalPayments = drafts.filter((d) => d.paymentType === 'FINAL');
      expect(finalPayments).toHaveSize(1);
      const due = new Date(finalPayments[0].dueDate);
      expect(due.getUTCDate()).toBe(15);
      expect(due.getUTCMonth()).toBe(0);
      expect(due.getUTCFullYear()).toBe(2027);
    });
  });

  describe('Cut dates (7 and 21)', () => {
    it('dueDate day ≤ 7 → cutDate is day 7 of same month', () => {
      const startDate = new Date(2026, 0, 5).getTime(); // Jan 5
      const endDate = addMonths(startDate, 12);
      const contract: Partial<Contract> = { uid: 'c1', scheme: 'A', source: 'COMUNIDAD', startDate, endDate };
      const tranche: Partial<Tranche> = { uid: 't1', contractUid: 'c1', amount: 100000, sequence: 1, fundedAt: startDate };
      const roleSplits: CommissionRoleSplit[] = [{ role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }];

      const drafts = service.generateForTranche(contract as Contract, tranche as Tranche, roleSplits);
      const immediate = drafts.find((d) => d.paymentType === 'IMMEDIATE');
      expect(immediate).toBeDefined();
      const cutDate = new Date(immediate!.cutDate);
      expect(cutDate.getDate()).toBe(7);
      expect(cutDate.getMonth()).toBe(0);
      expect(cutDate.getFullYear()).toBe(2026);
    });

    it('dueDate day ≤ 21 → cutDate is day 21 of same month', () => {
      const startDate = new Date(2026, 0, 15).getTime(); // Jan 15
      const endDate = addMonths(startDate, 12);
      const contract: Partial<Contract> = { uid: 'c1', scheme: 'A', source: 'COMUNIDAD', startDate, endDate };
      const tranche: Partial<Tranche> = { uid: 't1', contractUid: 'c1', amount: 100000, sequence: 1, fundedAt: startDate };
      const roleSplits: CommissionRoleSplit[] = [{ role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }];

      const drafts = service.generateForTranche(contract as Contract, tranche as Tranche, roleSplits);
      const firstRecurring = drafts.find((d) => d.paymentType === 'RECURRING' && d.installment === 2);
      expect(firstRecurring).toBeDefined();
      const cutDate = new Date(firstRecurring!.cutDate);
      expect(cutDate.getDate()).toBe(21);
      expect(cutDate.getMonth()).toBe(1); // Feb
      expect(cutDate.getFullYear()).toBe(2026);
    });

    it('dueDate day > 21 → cutDate is day 7 of next month', () => {
      const startDate = new Date(2026, 0, 25).getTime(); // Jan 25
      const endDate = addMonths(startDate, 12);
      const contract: Partial<Contract> = { uid: 'c1', scheme: 'A', source: 'COMUNIDAD', startDate, endDate };
      const tranche: Partial<Tranche> = { uid: 't1', contractUid: 'c1', amount: 100000, sequence: 1, fundedAt: startDate };
      const roleSplits: CommissionRoleSplit[] = [{ role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }];

      const drafts = service.generateForTranche(contract as Contract, tranche as Tranche, roleSplits);
      const immediate = drafts.find((d) => d.paymentType === 'IMMEDIATE');
      expect(immediate).toBeDefined();
      const cutDate = new Date(immediate!.cutDate);
      expect(cutDate.getDate()).toBe(7);
      expect(cutDate.getMonth()).toBe(1); // Feb
      expect(cutDate.getFullYear()).toBe(2026);
    });
  });

  describe('CommissionPolicy dynamics (Scheme A immediate bonus)', () => {
    it('applies extra commission only to immediate (5% immediate, 5% recurring)', () => {
      const startDate = new Date(2026, 11, 15).getTime(); // Dec 15 2026
      const endDate = addMonths(startDate, 12);

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate,
        yieldPercent: 13
      };

      const tranche: Partial<Tranche> = {
        uid: 't1',
        contractUid: 'c1',
        amount: 100000,
        sequence: 1,
        fundedAt: startDate
      };

      const policy: Partial<CommissionPolicy> = {
        uid: 'p1',
        scheme: 'A',
        active: true,
        validFrom: startDate - 1,
        validTo: startDate + 1,
        overrideImmediatePercent: 5,
        overrideTotalCommissionPercent: 10
      };

      const roleSplits: CommissionRoleSplit[] = [
        { role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }
      ];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits,
        policy as CommissionPolicy
      );

      const immediate = drafts.find((d) => d.paymentType === 'IMMEDIATE')!;
      expect(immediate.amount).toBe(5000);
      expect(immediate.grossCommissionPercent).toBe(10);
      expect(immediate.policyUid).toBe('p1');

      const recurring = drafts.filter((d) => d.paymentType === 'RECURRING');
      const recurringSum = recurring.reduce((acc, d) => acc + d.amount, 0);
      expect(Math.abs(recurringSum - 5000)).toBeLessThan(0.01);
    });

    it('if only total is overridden, immediate is derived as total - 5%', () => {
      const startDate = new Date(2026, 11, 15).getTime();
      const endDate = addMonths(startDate, 12);

      const contract: Partial<Contract> = { uid: 'c1', scheme: 'A', source: 'COMUNIDAD', startDate, endDate };
      const tranche: Partial<Tranche> = { uid: 't1', contractUid: 'c1', amount: 100000, sequence: 1, fundedAt: startDate };
      const policy: Partial<CommissionPolicy> = {
        uid: 'p1',
        scheme: 'A',
        active: true,
        validFrom: startDate - 1,
        validTo: startDate + 1,
        overrideTotalCommissionPercent: 10
      };
      const roleSplits: CommissionRoleSplit[] = [{ role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }];

      const drafts = service.generateForTranche(contract as Contract, tranche as Tranche, roleSplits, policy as CommissionPolicy);
      const immediate = drafts.find((d) => d.paymentType === 'IMMEDIATE')!;
      expect(immediate.amount).toBe(5000);
      expect(immediate.grossCommissionPercent).toBe(10);
    });
  });

  describe('CommissionPolicy dynamics (rules model)', () => {
    it('sums additionalPercent on immediate and recurring independently for scheme A', () => {
      const startDate = new Date(2026, 11, 15).getTime();
      const endDate = addMonths(startDate, 12);

      const contract: Partial<Contract> = {
        uid: 'c1',
        scheme: 'A',
        source: 'COMUNIDAD',
        startDate,
        endDate,
        yieldPercent: 16,
      };

      const tranche: Partial<Tranche> = {
        uid: 't1',
        contractUid: 'c1',
        amount: 100000,
        sequence: 1,
        fundedAt: startDate,
      };

      const policy: Partial<CommissionPolicy> = {
        uid: 'p-rules',
        name: 'Rules',
        active: true,
        validFrom: startDate - 1,
        validTo: startDate + 1,
        allowedSchemes: ['A'],
        rules: [
          {
            scheme: 'A',
            additionalPercent: 1,
            appliesToImmediate: true,
            appliesToRecurring: false,
          },
          {
            scheme: 'A',
            additionalPercent: 0.5,
            appliesToImmediate: false,
            appliesToRecurring: true,
          },
        ],
      };

      const roleSplits: CommissionRoleSplit[] = [{ role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits,
        policy as CommissionPolicy
      );

      const immediate = drafts.find((d) => d.paymentType === 'IMMEDIATE')!;
      expect(immediate.amount).toBe(5000);
      expect(immediate.grossCommissionPercent).toBe(10.5);

      const recurringSum = drafts
        .filter((d) => d.paymentType === 'RECURRING')
        .reduce((acc, d) => acc + d.amount, 0);
      expect(Math.abs(recurringSum - 5500)).toBeLessThan(0.02);
    });

    it('applies yield BETWEEN on rules for scheme B immediate only', () => {
      const startDate = new Date(2026, 5, 10).getTime();
      const contract: Partial<Contract> = {
        uid: 'cB',
        scheme: 'B',
        source: 'COMUNIDAD',
        startDate,
        yieldPercent: 18,
      };
      const tranche: Partial<Tranche> = {
        uid: 'tB',
        contractUid: 'cB',
        amount: 100000,
        sequence: 1,
        fundedAt: startDate,
      };
      const policy: Partial<CommissionPolicy> = {
        uid: 'pB',
        name: 'B dyn',
        active: true,
        validFrom: startDate - 1,
        validTo: startDate + 1,
        allowedSchemes: ['B'],
        rules: [
          {
            scheme: 'B',
            additionalPercent: 1,
            appliesToImmediate: true,
            appliesToRecurring: false,
            yieldCondition: { type: 'between', low: 17, high: 19 },
          },
        ],
      };
      const roleSplits: CommissionRoleSplit[] = [{ role: 'CONSULTANT', advisorUid: 'a1', percent: 100 }];

      const drafts = service.generateForTranche(
        contract as Contract,
        tranche as Tranche,
        roleSplits,
        policy as CommissionPolicy
      );
      const immediate = drafts.find((d) => d.paymentType === 'IMMEDIATE')!;
      expect(immediate.scheme).toBe('B');
      expect(immediate.amount).toBe(5000);
      expect(immediate.policyUid).toBe('pB');
    });
  });
});
