import { TestBed } from '@angular/core/testing';

import { CommissionConfigFirestoreService } from './commission-config-firestore.service';

describe('CommissionConfigFirestoreService', () => {
  let service: CommissionConfigFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommissionConfigFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
