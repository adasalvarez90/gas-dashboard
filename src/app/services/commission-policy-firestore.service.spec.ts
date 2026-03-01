import { TestBed } from '@angular/core/testing';

import { CommissionPolicyFirestoreService } from './commission-policy-firestore.service';

describe('CommissionPolicyFirestoreService', () => {
  let service: CommissionPolicyFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommissionPolicyFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
