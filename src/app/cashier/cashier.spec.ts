import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashierComponent } from './cashier';

describe('CashierComponent', () => {
  let component: CashierComponent;
  let fixture: ComponentFixture<Cashier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cashier]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cashier);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
