import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientComponent } from './client';

describe('ClientComponent', () => {
  let component: ClientComponent;
  let fixture: ComponentFixture<Client>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Client]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Client);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
