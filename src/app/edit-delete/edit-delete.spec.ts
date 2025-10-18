import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDelete } from './edit-delete';

describe('EditDelete', () => {
  let component: EditDelete;
  let fixture: ComponentFixture<EditDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDelete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
