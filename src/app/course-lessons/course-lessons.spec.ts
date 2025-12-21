import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseLessons } from './course-lessons';

describe('CourseLessons', () => {
  let component: CourseLessons;
  let fixture: ComponentFixture<CourseLessons>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseLessons]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseLessons);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
