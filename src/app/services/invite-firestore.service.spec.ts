import { TestBed } from '@angular/core/testing';

import { InviteFirestoreService } from './invite-firestore.service';

describe('InviteFirestoreService', () => {
  let service: InviteFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InviteFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
