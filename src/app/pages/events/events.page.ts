import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonRow,
  IonCol,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonMenuButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/angular/standalone';

import { AuthService } from 'src/app/services/auth/auth.service';
import { EventsService } from 'src/app/services/events/events.service';
import { UserService } from 'src/app/services/user/user.service';
import { BigDataService } from 'src/app/services/big-data/big-data.service';
import { Evento } from 'src/app/interfaces/evento.interface';

@Component({
  selector: 'app-events',
  templateUrl: './events.page.html',
  styleUrls: ['./events.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonButton,
    IonRow,
    IonCol,
    IonRefresher,
    IonRefresherContent,
    IonButtons,
    IonMenuButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent
  ]
})
export class EventsPage implements OnInit, OnDestroy {
  eventosOriginales: Evento[] = [];
  eventosVisibles: Evento[] = [];
  itemsPorPagina = 10;
  paginaActual = 1;
  busqueda: string = '';

  userEmail: string = '';
  userRol: string = '';

  eventosUnsubscribe: (() => void) | null = null;

  constructor(
    private authService: AuthService,
    private eventsService: EventsService,
    private bigDataService: BigDataService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnDestroy() {
    if (this.eventosUnsubscribe) this.eventosUnsubscribe();
  }

  async ngOnInit() {
    await this.inicializarEventos();
  }

  async ionViewWillEnter() {
    await this.inicializarEventos();
  }

  private parseDateToMs(value: any): number {
    if (!value) return 0;
    if (typeof value === 'string') {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
    return 0;
  }

  private isNotExpired(ev: Evento): boolean {
    const exp = this.parseDateToMs((ev as any).expirationDate);
    if (exp) return Date.now() <= exp;
    return true;
  }

  async inicializarEventos() {
    // Mantengo tu polling (simple y funciona bien cuando Auth tarda)
    const intervalo = setInterval(async () => {
      const user = this.authService.getCurrentUser();
      if (user?.email) {
        clearInterval(intervalo);

        this.userEmail = user.email!;
        this.userRol = await this.userService.getUserRoleByEmail(this.userEmail);

        await this.cargarEventos();
      }
    }, 300);
  }

  async cargarEventos() {
    const user = this.authService.getCurrentUser();
    if (!user?.email) return;

    this.userEmail = user.email!;
    this.userRol = await this.userService.getUserRoleByEmail(this.userEmail);

    // cancelar suscripción previa
    if (this.eventosUnsubscribe) this.eventosUnsubscribe();

    const procesarEventos = (eventos: Evento[]) => {
      // filtro por expiración (extra seguridad)
      eventos = eventos.filter(ev => this.isNotExpired(ev));

      // ordenar por eventDate desc
      eventos.sort((a, b) => {
        const da = this.parseDateToMs((a as any).eventDate);
        const db = this.parseDateToMs((b as any).eventDate);
        return db - da;
      });

      this.eventosOriginales = eventos;
      this.cargarEventosPaginados(true);
    };

    // superadmin/admin ve todo; otros ven solo asignados
    if (this.userRol === 'superadmin' || this.userRol === 'admin') {
      this.eventsService.subscribeToAllEventos(procesarEventos);
      this.eventosUnsubscribe = this.eventsService.eventosRealtimeSubscription;
    } else {
      this.eventsService.subscribeToEventosByUser(this.userEmail, procesarEventos);
      this.eventosUnsubscribe = this.eventsService.eventosRealtimeSubscription;
    }
  }

  cargarEventosPaginados(reset: boolean = false) {
    if (reset) {
      this.paginaActual = 1;
      this.eventosVisibles = [];
    }

    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = this.paginaActual * this.itemsPorPagina;

    const term = (this.busqueda || '').toLowerCase();

    const eventosFiltrados = this.eventosOriginales.filter(ev => {
      const nombre = String((ev as any).name || (ev as any).nombreevento || '').toLowerCase();
      return nombre.includes(term);
    });

    this.eventosVisibles.push(...eventosFiltrados.slice(inicio, fin));
    this.paginaActual++;
  }

  filtrarEventos() {
    this.cargarEventosPaginados(true);
  }

  async handleRefresh(event: any) {
    await this.cargarEventos();
    event.target.complete();
  }

  loadMore(event: any) {
    this.cargarEventosPaginados();

    const term = (this.busqueda || '').toLowerCase();
    const eventosFiltrados = this.eventosOriginales.filter(ev => {
      const nombre = String((ev as any).name || (ev as any).nombreevento || '').toLowerCase();
      return nombre.includes(term);
    });

    if (this.eventosVisibles.length >= eventosFiltrados.length) {
      event.target.disabled = true;
    }

    event.target.complete();
  }

  isPromotor(): boolean {
    return this.userRol === 'promotor';
  }

  isCliente(): boolean {
    return this.userRol === 'cliente';
  }

  calcularfecha(fecha: any): string {
    const ms = this.parseDateToMs(fecha);
    if (!ms) return '';

    return new Date(ms).toLocaleDateString('es-HN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  verMetricas(eventoId: string) {
    this.router.navigate(['/statistics', eventoId]);
  }

  escanear(event: Evento) {
    if (!event?.id) {
      console.error('❌ Evento sin ID.');
      return;
    }

    this.bigDataService.eventId = event.id;
    this.bigDataService.doc = event;

    this.router.navigate(['/scanner', event.id]);
  }
}
