import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseVideos } from './course-videos';

describe('CourseVideos', () => {
  let component: CourseVideos;
  let fixture: ComponentFixture<CourseVideos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseVideos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseVideos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
