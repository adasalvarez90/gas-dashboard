import { TestBed } from '@angular/core/testing';

import { MetricsAggregatorService } from './metrics-aggregator.service';

describe('MetricsAggregatorService', () => {
  let service: MetricsAggregatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetricsAggregatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
