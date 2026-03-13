import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService, Queue, Company } from '../../firestore'; // Import Company
import { QRCodeComponent } from 'angularx-qrcode'; // Import QRCodeComponent

@Component({
  selector: 'app-queue-management',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './queue-management.html',
  styleUrl: './queue-management.css',
})
export class QueueManagementComponent implements OnInit {
  newQueueName = signal<string>('');
  newQueuePrefix = signal<string>('');
  newQueueDescription = signal<string>('');
  
  companies = signal<Company[]>([]); // To store available companies
  selectedCompanyId = signal<string | null>(null); // To hold the selected company for queue creation/viewing

  queues = signal<Queue[]>([]);
  appBaseUrl: string = window.location.origin;

  constructor(private firestoreService: FirestoreService) {
    effect(() => {
      const currentSelectedCompanyId = this.selectedCompanyId();
      if (currentSelectedCompanyId) {
        this.firestoreService.getCompanyQueues(currentSelectedCompanyId).subscribe({
          next: (queues) => {
            this.queues.set(queues);
          },
          error: (err) => {
            console.error("Error fetching queues for company:", currentSelectedCompanyId, err);
            this.queues.set([]);
          }
        });
      } else {
        this.queues.set([]); // Clear queues if no company is selected
      }
    });
  }

  ngOnInit(): void {
    this.firestoreService.getCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        if (companies.length > 0 && !this.selectedCompanyId()) {
          this.selectedCompanyId.set(companies[0].id || null); // Automatically select the first company
        }
      },
      error: (err) => {
        console.error("Error fetching companies:", err);
      }
    });
  }

  onCompanySelected(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedCompanyId.set(selectElement.value);
  }

  async createNewQueue(): Promise<void> {
    const currentCompanyId = this.selectedCompanyId();
    if (!currentCompanyId) {
      alert('Please select a company first.');
      return;
    }
    if (!this.newQueueName() || !this.newQueuePrefix()) {
      alert('Please provide a queue name and prefix.');
      return;
    }

    try {
      const createdQueue = await this.firestoreService.createQueue(
        currentCompanyId,
        this.newQueueName(),
        this.newQueuePrefix(),
        this.newQueueDescription()
      );
      console.log('New queue created:', createdQueue);
      // Reset form fields
      this.newQueueName.set('');
      this.newQueuePrefix.set('');
      this.newQueueDescription.set('');
      alert(`Queue "${createdQueue.name}" created under company ID: ${currentCompanyId}`);
    } catch (error) {
      console.error("Error creating queue:", error);
      alert("Error creating queue. Please try again.");
    }
  }

  getQRCodeUrl(companyId: string, queueId: string | undefined): string {
    if (!queueId) {
      return '';
    }
    // QR code will now contain both companyId and queueId
    return `${this.appBaseUrl}/client?companyId=${companyId}&queueId=${queueId}`;
  }

  get selectedCompanyName(): string {
    const companyId = this.selectedCompanyId();
    if (companyId) {
      return this.companies().find(c => c.id === companyId)?.name || 'aucune compagnie sélectionnée';
    }
    return 'aucune compagnie sélectionnée';
  }
}
