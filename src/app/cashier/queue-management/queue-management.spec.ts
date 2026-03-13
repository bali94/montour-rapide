import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueueManagementComponent } from './queue-management';

describe('QueueManagementComponent', () => {
  let component: QueueManagementComponent;
  let fixture: ComponentFixture<QueueManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QueueManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
