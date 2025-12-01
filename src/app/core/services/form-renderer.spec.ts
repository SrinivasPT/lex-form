import { TestBed } from '@angular/core/testing';

import { FormRenderer } from './form-renderer';

describe('FormRenderer', () => {
  let service: FormRenderer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormRenderer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
