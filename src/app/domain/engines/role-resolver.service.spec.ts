import { TestBed } from '@angular/core/testing';

import { RoleResolverService } from './role-resolver.service';

describe('RoleResolverService', () => {
  let service: RoleResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
