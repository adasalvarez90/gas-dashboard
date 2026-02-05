import { TestBed } from '@angular/core/testing';

import { CommissionFirestoreService } from './commission-firestore.service';

describe('CommissionFirestoreService', () => {
  let service: CommissionFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommissionFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
