import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoomMeeting } from './zoom-meeting';

describe('ZoomMeeting', () => {
  let component: ZoomMeeting;
  let fixture: ComponentFixture<ZoomMeeting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoomMeeting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZoomMeeting);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
