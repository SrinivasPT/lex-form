import { TestBed } from '@angular/core/testing';

import { SchemaResolver } from './schema-resolver';

describe('SchemaResolver', () => {
  let service: SchemaResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SchemaResolver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
