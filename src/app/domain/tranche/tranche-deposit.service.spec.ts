import { TestBed } from '@angular/core/testing';

import { TrancheDepositService } from './tranche-deposit.service';

describe('TrancheDepositService', () => {
  let service: TrancheDepositService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrancheDepositService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
