import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService, Company } from '../../firestore'; // Import Company
import { QRCodeComponent } from 'angularx-qrcode'; // Import QRCodeComponent

@Component({
  selector: 'app-company-management',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent], // Add QRCodeComponent
  templateUrl: './company-management.html',
  styleUrl: './company-management.css',
})
export class CompanyManagementComponent implements OnInit {
  newCompanyName = signal<string>('');
  newCompanyDescription = signal<string>('');
  companies = signal<Company[]>([]);
  appBaseUrl: string = window.location.origin;

  constructor(private firestoreService: FirestoreService) { }

  ngOnInit(): void {
    this.firestoreService.getCompanies().subscribe({
      next: (companies) => {
        this.companies.set(companies);
      },
      error: (err) => {
        console.error("Error fetching companies:", err);
      }
    });
  }

  async createNewCompany(): Promise<void> {
    if (!this.newCompanyName()) {
      alert('Please provide a company name.');
      return;
    }

    try {
      const createdCompany = await this.firestoreService.addCompany(
        this.newCompanyName(),
        this.newCompanyDescription()
      );
      // Reset form fields
      this.newCompanyName.set('');
      this.newCompanyDescription.set('');
      alert(`Company "${createdCompany.name}" created with ID: ${createdCompany.id}`);
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Error creating company. Please try again.");
    }
  }

  getCompanyQRCodeUrl(companyId: string | undefined): string {
    if (!companyId) {
      return '';
    }
    // QR code will direct to the client page with companyId pre-selected
    // The client component will then default to a 'main-queue' or similar if no queueId is specified
    return `${this.appBaseUrl}/client?companyId=${companyId}`;
  }
}
