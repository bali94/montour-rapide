import { Component, OnInit, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreService, Queue, Ticket, Company, UserProfile } from '../firestore';
import { AuthService } from '../auth/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-cashier',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cashier.html',
  styleUrl: './cashier.css',
})
export class CashierComponent implements OnInit, OnDestroy {
  companies = signal<Company[]>([]);
  selectedCompanyId = signal<string | null>(null);

  queues = signal<Queue[]>([]);
  selectedQueueId = signal<string | null>(null);
  currentQueue = signal<Queue | null>(null);
  waitingTickets = signal<Ticket[]>([]);
  calledTicket = signal<Ticket | null>(null);
  nextTicketInLine = signal<Ticket | null>(null);

  isAdmin = signal<boolean>(false); // Signal for admin status

  private queueSubscription: Subscription | null = null;
  private userProfileSubscription: Subscription | null = null; // Subscription for user profile

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private router: Router
  ) {
    effect(() => {
      const waiting = this.waitingTickets();
      const called = this.calledTicket();

      if (called) {
        this.nextTicketInLine.set(null);
      } else if (waiting.length > 0) {
        this.nextTicketInLine.set(waiting[0]);
      } else {
        this.nextTicketInLine.set(null);
      }
    });

    effect(() => {
        const currentSelectedCompanyId = this.selectedCompanyId();
        const currentSelectedQueueId = this.selectedQueueId();

        if (this.queueSubscription) {
            this.queueSubscription.unsubscribe();
        }

        if (currentSelectedCompanyId && currentSelectedQueueId) {
            this.subscribeToQueueUpdates(currentSelectedCompanyId, currentSelectedQueueId);
            this.firestoreService.getQueue(currentSelectedCompanyId, currentSelectedQueueId).subscribe(queue => {
              this.currentQueue.set(queue);
            });
        } else {
            this.currentQueue.set(null);
            this.waitingTickets.set([]);
            this.calledTicket.set(null);
        }
    });
    effect(() => { // Effect for when selectedCompanyId changes, fetch queues for that company - MOVED FROM ngOnInit
      const companyId = this.selectedCompanyId();
      if (companyId) {
        this.firestoreService.getCompanyQueues(companyId).subscribe({
          next: (queues) => {
            this.queues.set(queues);
            if (queues.length > 0 && (!this.selectedQueueId() || !queues.find(q => q.id === this.selectedQueueId()))) {
              this.selectedQueueId.set(queues[0].id || null);
            } else if (queues.length === 0) {
                this.selectedQueueId.set(null);
            }
          },
          error: (err) => {
            this.queues.set([]);
            this.selectedQueueId.set(null);
          }
        });
      } else {
        this.queues.set([]);
        this.selectedQueueId.set(null);
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to userProfile$ to determine admin status
    this.userProfileSubscription = this.authService.userProfile$.subscribe(userProfile => {
      this.isAdmin.set(userProfile?.role === 'admin');
      if (userProfile && userProfile.role === 'agent' && userProfile.companyId) {
        this.selectedCompanyId.set(userProfile.companyId);
      } else if (userProfile && userProfile.role === 'agent' && !userProfile.companyId) {
        alert("You are an agent but not assigned to any company. Please contact your administrator.");
        this.router.navigate(['/login']);
      } else if (userProfile) {
        console.log('Admin logged in or user with role:', userProfile.role);
      } else {
        console.log('No user profile found.');
      }
    });

    this.firestoreService.getCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        // If no company is selected yet (e.g., admin or agent without pre-selected company from profile)
        // and if there are companies, select the first one. This ensures *some* company is always shown for admins.
        if (!this.selectedCompanyId() && companies.length > 0) {
          this.selectedCompanyId.set(companies[0].id || null);
        } else if (this.selectedCompanyId()) {
          console.log('Company already pre-selected by agent profile:', this.selectedCompanyId());
        }
      },
      error: (err) => {
        console.error("Error fetching companies:", err);
      }
    });

  }

  ngOnDestroy(): void {
    if (this.queueSubscription) {
      this.queueSubscription.unsubscribe();
    }
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }

  onCompanySelected(companyId: string): void {
    this.selectedCompanyId.set(companyId);
  }

  onQueueSelected(queueId: string): void {
    this.selectedQueueId.set(queueId);
  }

  subscribeToQueueUpdates(companyId: string, queueId: string): void {
    this.queueSubscription = this.firestoreService.getQueueTickets(companyId, queueId).subscribe({
      next: (allTickets) => {
        this.waitingTickets.set(allTickets.filter(t => t.status === 'en attente'));
        this.calledTicket.set(allTickets.find(t => t.status === 'appelé') || null);
      },
      error: (err) => {
        console.error("Erreur de mise à jour de la file d'attente:", err);
      }
    });
  }

  async appelerSuivant(): Promise<void> {
    const nextTicket = this.nextTicketInLine();
    const currentCompanyId = this.selectedCompanyId();
    const currentQueueId = this.selectedQueueId();

    if (!currentCompanyId || !currentQueueId) {
      alert("Veuillez sélectionner une compagnie et une file d'attente.");
      return;
    }

    if (nextTicket && nextTicket.id) {
      try {
        const currentlyCalled = this.calledTicket();
        if (currentlyCalled && currentlyCalled.id) {
            await this.firestoreService.updateTicketStatus(currentCompanyId, currentQueueId, currentlyCalled.id, 'terminé');
        }
        await this.firestoreService.updateTicketStatus(currentCompanyId, currentQueueId, nextTicket.id, 'appelé');
        alert(`Ticket ${nextTicket.fullTicketNumber} appelé !`);
      } catch (error) {
        console.error("Erreur lors de l'appel du suivant:", error);
        alert("Erreur lors de l'appel du prochain client.");
      }
    } else {
      alert("Il n'y a pas de client en attente à appeler.");
    }
  }

  async marquerCommeTermine(): Promise<void> {
    const ticketToComplete = this.calledTicket();
    const currentCompanyId = this.selectedCompanyId();
    const currentQueueId = this.selectedQueueId();

    if (!currentCompanyId || !currentQueueId) {
      alert("Veuillez sélectionner une compagnie et une file d'attente.");
      return;
    }

    if (ticketToComplete && ticketToComplete.id) {
      try {
        await this.firestoreService.updateTicketStatus(currentCompanyId, currentQueueId, ticketToComplete.id, 'terminé');
        alert(`Ticket ${ticketToComplete.fullTicketNumber} marqué comme terminé.`);
      } catch (error) {
        console.error("Erreur lors de la marquage comme terminé:", error);
        alert("Erreur lors de la marquage du client comme terminé.");
      }
    } else {
      alert("Aucun client n'est actuellement appelé pour être marqué comme terminé.");
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Erreur lors de la déconnexion.");
    }
  }

  get selectedCompanyName(): string {
    const companyId = this.selectedCompanyId();
    if (companyId) {
      return this.companies().find(c => c.id === companyId)?.name || 'Sélectionner une compagnie';
    }
    return 'Sélectionner une compagnie';
  }
}
