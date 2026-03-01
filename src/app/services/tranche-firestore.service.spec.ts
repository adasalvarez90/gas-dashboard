import { TestBed } from '@angular/core/testing';

import { TrancheFirestoreService } from './tranche-firestore.service';

describe('TrancheFirestoreService', () => {
  let service: TrancheFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrancheFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
