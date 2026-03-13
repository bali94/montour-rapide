import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyManagementComponent } from './company-management';

describe('CompanyManagement', () => {
  let component: CompanyManagement;
  let fixture: ComponentFixture<CompanyManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
