import { Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, CollectionReference, DocumentReference, getDoc, runTransaction, Query, QuerySnapshot, setDoc, collectionData } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

// Interface for Company
export interface Company {
  id?: string;
  name: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Interface for Queue
export interface Queue {
  id?: string;
  companyId: string; // New property to link queue to a company
  name: string;
  currentTicketNumber: number;
  prefix?: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Interface for Ticket
export interface Ticket {
  id?: string;
  firstName: string;
  fullTicketNumber: string;
  sequenceNumber: number;
  status: 'en attente' | 'appelé' | 'terminé' | 'annulé';
  createdAt: any;
  calledAt?: any;
  completedAt?: any;
  queueId: string;
}

export type UserRole = 'admin' | 'agent';

// Interface for User Profile
export interface UserProfile {
  uid: string;
  email: string;
  companyId?: any; // Optional, for agents assigned to a company
  role: UserRole;
  createdAt: any;
  updatedAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: Firestore) { }

  private getCompaniesCollection(): CollectionReference<Company> {
    return collection(this.firestore, 'companies') as CollectionReference<Company>;
  }

  private getQueuesCollection(companyId: string): CollectionReference<Queue> {
    return collection(this.firestore, `companies/${companyId}/queues`) as CollectionReference<Queue>;
  }

  private getTicketsCollection(companyId: string, queueId: string): CollectionReference<Ticket> {
    return collection(this.firestore, `companies/${companyId}/queues/${queueId}/tickets`) as CollectionReference<Ticket>;
  }

  private getUsersCollection(): CollectionReference<UserProfile> {
    return collection(this.firestore, 'users') as CollectionReference<UserProfile>;
  }

  // --- User Profile Management ---

  getUserProfile(uid: string): Observable<UserProfile | null> {
    const userDocRef: DocumentReference<UserProfile> = doc(this.getUsersCollection(), uid);
    return new Observable<UserProfile | null>(observer => {
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          observer.next({ ...docSnapshot.data() as UserProfile, uid: docSnapshot.id });
        } else {
          observer.next(null);
        }
      }, (error) => {
        observer.error(error);
      });
      return () => unsubscribe();
    });
  }

  async createUserProfile(uid: string, email: string, role: UserRole, companyId?: string): Promise<UserProfile> {
    const newUserProfile: UserProfile = {
      uid,
      email,
      role,
      companyId: companyId ?? null, // Set to null if undefined
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const userDocRef = doc(this.getUsersCollection(), uid);
    await setDoc(userDocRef, newUserProfile);
    return newUserProfile;
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const userDocRef = doc(this.getUsersCollection(), uid);
    await updateDoc(userDocRef, { ...data, updatedAt: serverTimestamp() });
  }

  // Get users with role 'agent'
  getAgents(): Observable<UserProfile[]> {
    const usersCollection = this.getUsersCollection();
    const q = query(usersCollection, where('role', '==', 'agent'));
    return collectionData(q, { idField: 'uid' }) as Observable<UserProfile[]>;
  }

  // --- Company Management ---

  getCompanies(): Observable<Company[]> {
    return collectionData(this.getCompaniesCollection(), { idField: 'id' });
  }

  async addCompany(name: string, description?: string): Promise<Company> {
    const newCompany: Partial<Company> = {
      name,
      description,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(this.getCompaniesCollection(), newCompany);
    return { id: docRef.id, ...newCompany as Company };
  }

  // --- Queue Management ---

  // Get a specific queue by ID within a company
  getQueue(companyId: string, queueId: string): Observable<Queue | null> {
    const queueDocRef: DocumentReference<Queue> = doc(this.getQueuesCollection(companyId), queueId);
    return from(getDoc(queueDocRef)).pipe(
      map(docSnapshot => {
        if (docSnapshot.exists()) {
          return { id: docSnapshot.id, ...docSnapshot.data() };
        } else {
          return null;
        }
      })
    );
  }

  // Get all queues for a specific company
  getCompanyQueues(companyId: string): Observable<Queue[]> {
    return collectionData(this.getQueuesCollection(companyId), { idField: 'id' });
  }

  // Create a new queue within a specific company
  async createQueue(companyId: string, name: string, prefix: string, description?: string): Promise<Queue> {
    const newQueue: Partial<Queue> = {
      companyId, // Assign companyId
      name,
      prefix,
      description,
      currentTicketNumber: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(this.getQueuesCollection(companyId), newQueue);
    return { id: docRef.id, ...newQueue as Queue };
  }

  // Create a default queue if it doesn't exist (used by client for backward compatibility, now requiring companyId)
  async createDefaultQueue(companyId: string, queueId: string, queueName: string): Promise<Queue> {
    const queueDocRef: DocumentReference<Queue> = doc(this.getQueuesCollection(companyId), queueId);
    const queueSnapshot = await getDoc(queueDocRef);

    if (!queueSnapshot.exists()) {
      const newQueue:any  = {
        companyId,
        name: queueName,
        currentTicketNumber: 0,
        prefix: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(queueDocRef, newQueue);
      return { id: queueDocRef.id, ...newQueue };
    } else {
      return { id: queueSnapshot.id, ...queueSnapshot.data() };
    }
  }

  // --- Ticket Management ---

  // Add a new ticket to a specific queue within a company
  async addTicket(companyId: string, queueId: string, firstName: string): Promise<Ticket> {
    const queueDocRef: DocumentReference<Queue> = doc(this.getQueuesCollection(companyId), queueId);

    return runTransaction(this.firestore, async (transaction) => {
      const queueDoc = await transaction.get(queueDocRef);

      if (!queueDoc.exists()) {
        throw new Error("La file d'attente n'existe pas!");
      }

      const currentTicketNumber = queueDoc.data()?.currentTicketNumber || 0;
      const newSequenceNumber = currentTicketNumber + 1;
      const prefix = queueDoc.data()?.prefix || '';
      const fullTicketNumber = `${prefix}${String(newSequenceNumber).padStart(3, '0')}`;

      const newTicket: Ticket = {
        firstName,
        fullTicketNumber,
        sequenceNumber: newSequenceNumber,
        status: 'en attente',
        createdAt: serverTimestamp(),
        queueId: queueId
      };

      const ticketDocRef = doc(this.getTicketsCollection(companyId, queueId));
      transaction.set(ticketDocRef, newTicket);
      transaction.update(queueDocRef, { currentTicketNumber: newSequenceNumber, updatedAt: serverTimestamp() });

      return { id: ticketDocRef.id, ...newTicket };
    });
  }

  // Get real-time updates for tickets in a queue within a company
  getQueueTickets(companyId: string, queueId: string): Observable<Ticket[]> {
    const ticketsCollection = this.getTicketsCollection(companyId, queueId);
    const q: Query<Ticket> = query(
      ticketsCollection,
      where('status', 'in', ['en attente', 'appelé']),
      orderBy('sequenceNumber', 'asc')
    );

    return new Observable<Ticket[]>(observer => {
      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<Ticket>) => {
        const tickets: Ticket[] = [];
        snapshot.forEach(doc => {
          tickets.push({ id: doc.id, ...doc.data() });
        });
        observer.next(tickets);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  // Get real-time updates for a single ticket by its ID within a company and queue
  getTicketById(companyId: string, queueId: string, ticketId: string): Observable<Ticket | null> {
    const ticketDocRef: DocumentReference<Ticket> = doc(this.getTicketsCollection(companyId, queueId), ticketId);
    return new Observable<Ticket | null>(observer => {
      const unsubscribe = onSnapshot(ticketDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          observer.next({ id: docSnapshot.id, ...docSnapshot.data() });
        } else {
          observer.next(null);
        }
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }


  // Update ticket status within a company and queue
  async updateTicketStatus(companyId: string, queueId: string, ticketId: string, status: 'appelé' | 'terminé' | 'annulé'): Promise<void> {
    const ticketDocRef: DocumentReference<Ticket> = doc(this.getTicketsCollection(companyId, queueId), ticketId);
    const updateData: any = { status, updatedAt: serverTimestamp() };

    if (status === 'appelé') {
      updateData.calledAt = serverTimestamp();
    } else if (status === 'terminé' || status === 'annulé') {
      updateData.completedAt = serverTimestamp();
    }

    return updateDoc(ticketDocRef, updateData);
  }

  // Get the next ticket in line for the cashier within a company and queue
  getNextTicket(companyId: string, queueId: string): Observable<Ticket | null> {
    const ticketsCollection = this.getTicketsCollection(companyId, queueId);
    const q: Query<Ticket> = query(
      ticketsCollection,
      where('status', '==', 'en attente'),
      orderBy('sequenceNumber', 'asc'),
      limit(1)
    );

    return new Observable<Ticket | null>(observer => {
      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<Ticket>) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          observer.next({ id: doc.id, ...doc.data() });
        } else {
          observer.next(null);
        }
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }
}
