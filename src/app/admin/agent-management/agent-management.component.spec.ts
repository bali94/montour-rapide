import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentManagementComponent } from './agent-management.component';
import { FirestoreService } from '../../firestore';
import { of } from 'rxjs';

describe('AgentManagementComponent', () => {
  let component: AgentManagementComponent;
  let fixture: ComponentFixture<AgentManagementComponent>;
  let firestoreServiceSpy: jasmine.SpyObj<FirestoreService>;

  beforeEach(async () => {
    firestoreServiceSpy = jasmine.createSpyObj('FirestoreService', ['getCompanies', 'getAgents', 'updateUserProfile']);
    firestoreServiceSpy.getCompanies.and.returnValue(of([
      { id: 'comp1', name: 'Company A' },
      { id: 'comp2', name: 'Company B' },
    ]));
    firestoreServiceSpy.getAgents.and.returnValue(of([
      { uid: 'agent1', email: 'agent1@example.com', role: 'agent', companyId: 'comp1', createdAt: new Date(), updatedAt: new Date() },
      { uid: 'agent2', email: 'agent2@example.com', role: 'agent', companyId: null, createdAt: new Date(), updatedAt: new Date() },
    ]));
    firestoreServiceSpy.updateUserProfile.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [AgentManagementComponent],
      providers: [
        { provide: FirestoreService, useValue: firestoreServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgentManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load companies and agents on init', () => {
    expect(firestoreServiceSpy.getCompanies).toHaveBeenCalled();
    expect(firestoreServiceSpy.getAgents).toHaveBeenCalled();
    expect(component.companies().length).toBe(2);
    expect(component.agents().length).toBe(2);
    expect(component.selectedCompanyIds().get('agent1')).toBe('comp1');
    expect(component.selectedCompanyIds().get('agent2')).toBe(null);
  });

  it('should update selectedCompanyIds when onCompanySelected is called', () => {
    const newCompanyId = 'comp2';
    component.onCompanySelected('agent2', newCompanyId);
    expect(component.selectedCompanyIds().get('agent2')).toBe('comp2');

    const emptyCompanyId = '';
    component.onCompanySelected('agent1', emptyCompanyId);
    expect(component.selectedCompanyIds().get('agent1')).toBe(null);
  });

  it('should call updateUserProfile when updateAgentCompany is called', async () => {
    const agentToUpdate = { uid: 'agent1', email: 'agent1@example.com', role: 'agent', companyId: 'comp1', createdAt: new Date(), updatedAt: new Date() };
    component.selectedCompanyIds.set(new Map(component.selectedCompanyIds()).set('agent1', 'comp2'));
    await component.updateAgentCompany(agentToUpdate);
    expect(firestoreServiceSpy.updateUserProfile).toHaveBeenCalledWith('agent1', { companyId: 'comp2' });
  });

  it('should return correct company name', () => {
    expect(component.getCompanyName('comp1')).toBe('Company A');
    expect(component.getCompanyName(null)).toBe('No company assigned');
    expect(component.getCompanyName('unknown')).toBe('Unknown Company');
  });
});
