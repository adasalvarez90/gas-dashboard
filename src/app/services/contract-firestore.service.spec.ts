import { TestBed } from '@angular/core/testing';

import { ContractFirestoreService } from './contract-firestore.service';

describe('ContractFirestoreService', () => {
  let service: ContractFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContractFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
