import { TestBed } from '@angular/core/testing';

import { InviteEmailService } from './invite-email.service';

describe('InviteEmailService', () => {
  let service: InviteEmailService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InviteEmailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
