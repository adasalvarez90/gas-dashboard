import { TestBed } from '@angular/core/testing';

import { TagFirestoreService } from './tag-firestore.service';

describe('TagFirestoreService', () => {
  let service: TagFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TagFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
