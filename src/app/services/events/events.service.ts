import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  onSnapshot
} from '@angular/fire/firestore';
import { Evento } from 'src/app/interfaces/evento.interface';
import { UserData } from 'src/app/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  eventosRealtimeSubscription: (() => void) | null = null;

  constructor(private firestore: Firestore) {}

  /** Helpers */
  private parseDateToMs(value: any): number {
    if (!value) return 0;

    // ISO string date
    if (typeof value === 'string') {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    }

    // unix seconds
    if (typeof value === 'number') {
      // si parece segundos (10 dígitos), lo convertimos
      return value < 1e12 ? value * 1000 : value;
    }

    return 0;
  }

  private isActiveEvent(evento: Evento): boolean {
    const status = (evento as any).status;
    if (status && status !== 'active') return false;

    const expiration = this.parseDateToMs((evento as any).expirationDate);
    if (expiration) return Date.now() <= expiration;

    // fallback si no hay expirationDate: permitir mientras exista eventDate
    const eventDate = this.parseDateToMs((evento as any).eventDate);
    return !!eventDate;
  }

  async getAllEvents(): Promise<Evento[]> {
    const eventsRef = collection(this.firestore, 'events');
    const q = query(eventsRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map(d => ({ id: d.id, ...(d.data() as any) } as Evento))
      .filter(ev => this.isActiveEvent(ev));
  }

  async getCollection(eventId: string): Promise<Evento | null> {
    const eventoRef = doc(this.firestore, 'events', eventId);
    const eventoSnap = await getDoc(eventoRef);
    if (!eventoSnap.exists()) return null;

    const evento = { id: eventoSnap.id, ...(eventoSnap.data() as any) } as Evento;
    return this.isActiveEvent(evento) ? evento : evento; // lo devolvemos aunque esté vencido (por si lo necesitás ver)
  }

  /** Eventos asignados según users.assignedEventId[] */
  async getEventsByUser(email: string): Promise<Evento[]> {
    const usersRef = collection(this.firestore, 'users');
    const qUser = query(usersRef, where('email', '==', email));
    const snap = await getDocs(qUser);

    if (snap.empty) return [];

    const userData = snap.docs[0].data() as UserData;
    const ids: string[] = Array.isArray((userData as any).assignedEventId) ? (userData as any).assignedEventId : [];

    if (ids.length === 0) return [];

    // Traemos por lotes de 10 (limitación de Firestore con "in")
    const batches = [...Array(Math.ceil(ids.length / 10))].map((_, i) =>
      ids.slice(i * 10, i * 10 + 10)
    );

    const results: Evento[] = [];

    for (const batchIds of batches) {
      const eventsRef = collection(this.firestore, 'events');
      const qEvents = query(eventsRef, where('__name__', 'in', batchIds));
      const snapshot = await getDocs(qEvents);

      results.push(...snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Evento)));
    }

    return results.filter(ev => this.isActiveEvent(ev));
  }

  /** Suscripción realtime por usuario usando assignedEventId[] */
  subscribeToEventosByUser(email: string, callback: (eventos: Evento[]) => void) {
    const usersRef = collection(this.firestore, 'users');
    const qUser = query(usersRef, where('email', '==', email));

    getDocs(qUser).then(snap => {
      if (snap.empty) return callback([]);

      const userData = snap.docs[0].data() as UserData;
      const ids: string[] = Array.isArray((userData as any).assignedEventId) ? (userData as any).assignedEventId : [];

      if (ids.length === 0) return callback([]);

      // Cancelar suscripción anterior
      if (this.eventosRealtimeSubscription) this.eventosRealtimeSubscription();

      const eventosTotales: Evento[] = [];
      const unsubscribers: (() => void)[] = [];

      const batches = [...Array(Math.ceil(ids.length / 10))].map((_, i) =>
        ids.slice(i * 10, i * 10 + 10)
      );

      batches.forEach(batchIds => {
        const eventsRef = collection(this.firestore, 'events');
        const qEventos = query(eventsRef, where('__name__', 'in', batchIds));

        const unsubscribe = onSnapshot(qEventos, snapshot => {
          // limpiar los ids del batch que ya no vienen
          const incomingIds = snapshot.docs.map(d => d.id);

          batchIds.forEach(id => {
            if (!incomingIds.includes(id)) {
              const idx = eventosTotales.findIndex(e => e.id === id);
              if (idx !== -1) eventosTotales.splice(idx, 1);
            }
          });

          const eventos = snapshot.docs
            .map(d => ({ id: d.id, ...(d.data() as any) } as Evento))
            .filter(ev => this.isActiveEvent(ev));

          // remover batch previo y reemplazar con lo nuevo filtrado
          for (let i = eventosTotales.length - 1; i >= 0; i--) {
            if (batchIds.includes(eventosTotales[i].id)) eventosTotales.splice(i, 1);
          }
          eventosTotales.push(...eventos);

          callback([...eventosTotales]);
        });

        unsubscribers.push(unsubscribe);
      });

      this.eventosRealtimeSubscription = () => {
        unsubscribers.forEach(u => u());
      };
    });
  }

  /** Suscripción realtime a TODOS los eventos (superadmin) */
  subscribeToAllEventos(callback: (eventos: Evento[]) => void) {
    if (this.eventosRealtimeSubscription) this.eventosRealtimeSubscription();

    const eventsRef = collection(this.firestore, 'events');
    const q = query(eventsRef, where('status', '==', 'active'));

    this.eventosRealtimeSubscription = onSnapshot(q, snapshot => {
      const eventos = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as Evento))
        .filter(ev => this.isActiveEvent(ev));

      callback(eventos);
    });
  }

  unsubscribeToEventos() {
    if (this.eventosRealtimeSubscription) {
      this.eventosRealtimeSubscription();
      this.eventosRealtimeSubscription = null;
    }
  }
}
