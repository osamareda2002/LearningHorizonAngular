import { TestBed } from '@angular/core/testing';

import { Suggestion } from './suggestion';

describe('Suggestion', () => {
  let service: Suggestion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Suggestion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
