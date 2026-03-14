import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { companyIdGuard } from './company-id-guard';

describe('companyIdGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => companyIdGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
