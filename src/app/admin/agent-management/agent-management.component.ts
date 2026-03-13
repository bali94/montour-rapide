import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService, UserProfile, Company } from '../../firestore';

@Component({
  selector: 'app-agent-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-management.html',
  styleUrl: './agent-management.css',
})
export class AgentManagementComponent implements OnInit {
  agents = signal<UserProfile[]>([]);
  companies = signal<Company[]>([]);
  // Use a map to store selected company IDs for each agent for easier two-way binding
  selectedCompanyIds = signal<Map<string, string | null>>(new Map());

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit(): void {
    // Fetch all companies
    this.firestoreService.getCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
      },
      error: (err) => {
        console.error("Error fetching companies:", err);
      }
    });

    // Fetch all agents
    this.firestoreService.getAgents().subscribe({
      next: (agents) => {
        this.agents.set(agents);
        // Initialize selectedCompanyIds map
        const initialSelections = new Map<string, string | null>();
        agents.forEach(agent => {
          if (agent.uid) {
            initialSelections.set(agent.uid, agent.companyId || null);
          }
        });
        this.selectedCompanyIds.set(initialSelections);
      },
      error: (err) => {
        console.error("Error fetching agents:", err);
      }
    });
  }

  onCompanySelected(agentId: string, companyId: string): void {
    const newSelectedCompanyIds = new Map(this.selectedCompanyIds());
    newSelectedCompanyIds.set(agentId, companyId === '' ? null : companyId);
    this.selectedCompanyIds.set(newSelectedCompanyIds);
  }

  async updateAgentCompany(agent: UserProfile): Promise<void> {
    if (!agent.uid) {
      console.error("Agent UID is missing, cannot update.");
      return;
    }

    const newCompanyId = this.selectedCompanyIds().get(agent.uid);

    try {
      await this.firestoreService.updateUserProfile(agent.uid, { companyId: newCompanyId });
      alert(`Agent ${agent.email}'s company updated successfully!`);
    } catch (error) {
      console.error("Error updating agent company:", error);
      alert("Error updating agent company. Please try again.");
    }
  }

  // Helper to get company name for display
  getCompanyName(companyId: string | null | undefined): string {
    if (!companyId) {
      return 'No company assigned';
    }
    return this.companies().find(c => c.id === companyId)?.name || 'Unknown Company';
  }
}
