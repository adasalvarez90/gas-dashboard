import { TestBed } from '@angular/core/testing';

import { CommissionEngineService } from './commission-engine.service';

describe('CommissionEngineService', () => {
  let service: CommissionEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommissionEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
