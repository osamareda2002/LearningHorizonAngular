import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalInfo } from './additional-info';

describe('AdditionalInfo', () => {
  let component: AdditionalInfo;
  let fixture: ComponentFixture<AdditionalInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdditionalInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdditionalInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
