import { TestBed } from '@angular/core/testing';

import { DepositFirestoreService } from './deposit-firestore.service';

describe('DepositFirestoreService', () => {
  let service: DepositFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DepositFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
