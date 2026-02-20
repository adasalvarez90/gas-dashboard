import { TestBed } from '@angular/core/testing';

import { CommissionPaymentFirestoreService } from './commission-payment-firestore.service';

describe('CommissionPaymentFirestoreService', () => {
  let service: CommissionPaymentFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommissionPaymentFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
