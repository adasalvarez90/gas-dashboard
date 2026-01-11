import { TestBed } from '@angular/core/testing';

import { FirebaseAuthServiceTs } from './firebase-auth.service.ts';

describe('FirebaseAuthServiceTs', () => {
  let service: FirebaseAuthServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseAuthServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
