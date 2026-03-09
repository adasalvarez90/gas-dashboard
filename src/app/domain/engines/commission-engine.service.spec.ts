import { TestBed } from '@angular/core/testing';
import { CommissionEngineService } from './commission-engine.service';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionRoleSplit } from 'src/app/models/commission-engine.model';

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
  });
});
