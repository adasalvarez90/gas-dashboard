import { TestBed } from '@angular/core/testing';

import { AdvisorFirestoreService } from './advisor-firestore.service';

describe('AdvisorFirestoreService', () => {
  let service: AdvisorFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdvisorFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
