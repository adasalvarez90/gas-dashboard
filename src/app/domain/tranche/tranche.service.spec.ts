import { TestBed } from '@angular/core/testing';

import { TrancheService } from './tranche.service';

describe('TrancheService', () => {
  let service: TrancheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrancheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
