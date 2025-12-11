import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormLib } from './form-lib';

describe('FormLib', () => {
  let component: FormLib;
  let fixture: ComponentFixture<FormLib>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormLib]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormLib);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
