import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreService, Ticket } from '../firestore';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client.html',
  styleUrl: './client.css',
})
export class ClientComponent implements OnInit {
  firstName: string = '';
  ticketId: string | null = null;
  currentTicket = signal<Ticket | null>(null);
  waitingTickets = signal<Ticket[]>([]);
  peopleAhead = signal<number>(0);
  
  companyId: string = 'default-company-id'; // Default company ID
  queueId: string = 'main-queue'; // Default queue ID

  constructor(
    private firestoreService: FirestoreService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Effect to react to changes in currentTicket
    effect(() => {
      const ticket = this.currentTicket();
      if (ticket) {
        console.log(`Mon ticket: ${ticket.fullTicketNumber}, Status: ${ticket.status}`);
      }
    });
    // Effect to react to changes in waitingTickets and calculate peopleAhead
    effect(() => {
      const tickets = this.waitingTickets();
      const currentTicketValue = this.currentTicket();
      if (currentTicketValue && tickets.length > 0) {
        const myIndex = tickets.findIndex(t => t.id === currentTicketValue.id);
        if (myIndex !== -1) {
          this.peopleAhead.set(myIndex); // Number of people before me
        }
      } else {
        this.peopleAhead.set(0);
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      // Prioritize companyId from route parameters
      if (params['companyId']) {
        this.companyId = params['companyId'];
        localStorage.setItem('myCompanyId', this.companyId);
      } else {
        const storedCompanyId = localStorage.getItem('myCompanyId');
        if (storedCompanyId) {
          this.companyId = storedCompanyId;
        }
      }

      // Prioritize queueId from route parameters
      if (params['queueId']) {
        this.queueId = params['queueId'];
        localStorage.setItem('myQueueId', this.queueId);
      } else {
        const storedQueueId = localStorage.getItem('myQueueId');
        if (storedQueueId) {
          this.queueId = storedQueueId;
        }
      }

      // Only subscribe to updates if both companyId and queueId are available
      const storedTicketId = localStorage.getItem('myTicketId');
      if (this.companyId && this.queueId) {
        // Ensure default queue exists when client page loads
        // This is done here as createDefaultQueue now requires companyId
        this.firestoreService.createDefaultQueue(this.companyId, this.queueId, 'File Principale').then(queue => {
        }).catch(error => {
          console.error('Error ensuring default queue:', error);
          // Potentially alert user or handle cases where default company/queue doesn't exist
        });

        if (storedTicketId) {
          this.ticketId = storedTicketId;
          this.subscribeToTicketUpdates();
          this.subscribeToQueueUpdates();
        }
      } else {
        console.warn("Missing companyId or queueId. Cannot subscribe to updates.");
        // Potentially redirect or show an error message to the user
      }
    });
  }

  async prendreMonTour() {
    if (!this.firstName.trim()) {
      alert('Veuillez entrer votre prénom.');
      return;
    }
    if (!this.companyId || !this.queueId) {
      alert("Missing company or queue information. Please scan a valid QR code or ensure the URL is correct.");
      return;
    }

    try {
      const newTicket = await this.firestoreService.addTicket(this.companyId, this.queueId, this.firstName.trim());
      this.ticketId = newTicket.id || null;
      localStorage.setItem('myTicketId', newTicket.id || '');
      localStorage.setItem('myQueueId', this.queueId);
      localStorage.setItem('myCompanyId', this.companyId); // Store companyId
      this.subscribeToTicketUpdates();
      this.subscribeToQueueUpdates();
      alert(`Votre ticket: ${newTicket.fullTicketNumber}.`);
    } catch (error: any) {
      console.error("Erreur lors de la prise du tour:", error);
      alert(`Erreur: ${error.message}`);
    }
  }

  subscribeToTicketUpdates(): void {
    if (this.ticketId && this.companyId && this.queueId) {
      this.firestoreService.getTicketById(this.companyId, this.queueId, this.ticketId).subscribe({
        next: (ticket) => {
          this.currentTicket.set(ticket);
          if (ticket?.status === 'terminé' || ticket?.status === 'annulé') {
            alert(`Votre tour est ${ticket.status}. Vous pouvez fermer cette page.`);
            this.resetTicket();
          } else if (ticket?.status === 'appelé') {
            alert(`C'est votre tour ! Dirigez-vous vers le comptoir !`);
          }
        },
        error: (err) => {
          console.error("Erreur de mise à jour du ticket:", err);
          alert("Erreur lors du suivi de votre ticket.");
        }
      });
    }
  }

  subscribeToQueueUpdates(): void {
    if (this.companyId && this.queueId) {
      this.firestoreService.getQueueTickets(this.companyId, this.queueId).subscribe({
        next: (tickets) => {
          this.waitingTickets.set(tickets);
        },
        error: (err) => {
          console.error("Erreur de mise à jour de la file d'attente:", err);
        }
      });
    }
  }

  resetTicket(): void {
    localStorage.removeItem('myTicketId');
    localStorage.removeItem('myQueueId');
    localStorage.removeItem('myCompanyId'); // Remove companyId
    this.ticketId = null;
    this.firstName = '';
    this.currentTicket.set(null);
    this.waitingTickets.set([]);
    this.peopleAhead.set(0);
    // Optionally, redirect to a default client view or home if company/queue is not set
    // this.router.navigate(['/client']);
  }
}
