import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonRefresher,
  IonRefresherContent,
  IonButton
} from '@ionic/angular/standalone';

import { AuthService } from 'src/app/services/auth/auth.service';
import { EventsService } from 'src/app/services/events/events.service';
import { UserService } from 'src/app/services/user/user.service';
import { Evento } from 'src/app/interfaces/evento.interface';
import { SessionUser, UserData } from 'src/app/interfaces/user.interface';
import { Storage } from '@ionic/storage-angular';

import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonRefresher,
    IonRefresherContent,
    RouterModule,
    IonButton
  ]
})
export class InicioPage implements OnInit, OnDestroy {
  saludo = '';
  nombreUsuario = '';
  eventosProximos: Evento[] = [];
  eventosUnsubscribe: (() => void) | null = null;

  constructor(
    private authService: AuthService,
    private eventsService: EventsService,
    private userService: UserService,
    private storage: Storage,
    private router: Router,
    private firestore: Firestore
  ) {}

  async ngOnInit() {
    await this.storage.create();
    await this.inicializar();
  }

  async ionViewWillEnter() {
    this.saludo = this.obtenerSaludo();
    await this.inicializar();
  }

  ngOnDestroy() {
    if (this.eventosUnsubscribe) this.eventosUnsubscribe();
  }

  obtenerSaludo(): string {
    const hora = new Date().getHours();
    return hora < 12 ? '🌞 Buenos días' : hora < 18 ? '🌤️ Buenas tardes' : '🌙 Buenas noches';
  }

  private parseDateToMs(value: any): number {
    if (!value) return 0;

    if (typeof value === 'string') {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    }

    if (typeof value === 'number') {
      return value < 1e12 ? value * 1000 : value;
    }

    return 0;
  }

  /** Si el nombre parece "prefix del correo", no lo usamos */
  private isEmailishName(name: string, email: string): boolean {
    if (!name) return true;

    const prefix = (email || '').split('@')[0]?.toLowerCase();
    const n = name.trim().toLowerCase();

    if (prefix && n === prefix) return true;
    if (n.includes('@')) return true;

    return false;
  }

  private async getUserByUid(uid: string): Promise<UserData | null> {
    const ref = doc(this.firestore, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return ({ id: snap.id, ...(snap.data() as any) } as UserData);
  }

  async inicializar() {
    const user = this.authService.getCurrentUser();
    if (!user?.email || !user?.uid) return;

    const email = user.email;
    const emailPrefix = email.split('@')[0];

    // 1) Intentar desde storage (rápido)
    const session: SessionUser | null = await this.storage.get('usuario');
    const sessionAny = session as any;

    const candidate =
      (sessionAny?.firstName && String(sessionAny.firstName).trim()) ||
      (sessionAny?.fullName && String(sessionAny.fullName).trim()) ||
      '';

    if (candidate && !this.isEmailishName(candidate, email)) {
      this.nombreUsuario = candidate;
    } else {
      // 2) ✅ SIEMPRE por UID (esto te trae firstName = "Danny")
      try {
        const userData = await this.getUserByUid(user.uid);

        const fixedName =
          (userData?.firstName && String(userData.firstName).trim()) ||
          (userData?.fullName && String(userData.fullName).trim()) ||
          '';

        if (fixedName) {
          this.nombreUsuario = fixedName;
        } else {
          this.nombreUsuario = emailPrefix;
        }

        // ✅ actualizar storage para que ya no vuelva a salir "sinoeproducciones"
        const storedUsuario = (await this.storage.get('usuario')) || {};
        await this.storage.set('usuario', {
          ...storedUsuario,
          email: userData?.email ?? email,
          fullName: userData?.fullName ?? storedUsuario.fullName ?? '',
          firstName: userData?.firstName ?? storedUsuario.firstName ?? '',
          lastName: userData?.lastName ?? storedUsuario.lastName ?? '',
          role: (userData as any)?.role ?? storedUsuario.role ?? 'usuario',
          status: (userData as any)?.status ?? storedUsuario.status ?? 'active'
        });

        const storedUser = (await this.storage.get('user')) || {};
        await this.storage.set('user', {
          ...storedUser,
          email: userData?.email ?? email,
          fullName: userData?.fullName ?? storedUser.fullName ?? '',
          firstName: userData?.firstName ?? storedUser.firstName ?? ''
        });
      } catch (err) {
        console.error('❌ Error leyendo user por UID en Inicio:', err);
        this.nombreUsuario = emailPrefix;
      }
    }

    // ✅ rol por UID (evita queries por email si rules molestan)
    let rol = '';
    try {
      const u = await this.getUserByUid(user.uid);
      rol = ((u as any)?.role || (u as any)?.rol || sessionAny?.role || sessionAny?.rol || 'usuario') as string;
    } catch {
      rol = (sessionAny?.role || sessionAny?.rol || 'usuario') as string;
    }

    const procesarEventos = (eventos: Evento[]) => {
      const now = Date.now();

      const filtrados = eventos
        .filter(ev => {
          const exp = this.parseDateToMs((ev as any).expirationDate);
          return exp ? now <= exp : true;
        })
        .sort((a, b) => {
          const da = this.parseDateToMs((a as any).eventDate);
          const db = this.parseDateToMs((b as any).eventDate);
          return da - db;
        });

      this.eventosProximos = filtrados;
    };

    if (this.eventosUnsubscribe) this.eventosUnsubscribe();

    if (rol === 'superadmin') {
      this.eventsService.subscribeToAllEventos(procesarEventos);
      this.eventosUnsubscribe = this.eventsService.eventosRealtimeSubscription;
    } else {
      this.eventsService.subscribeToEventosByUser(email, procesarEventos);
      this.eventosUnsubscribe = this.eventsService.eventosRealtimeSubscription;
    }
  }

  irAEventos() {
    this.router.navigate(['/events']);
  }

  async handleRefresh(event: any) {
    await this.inicializar();
    event.target.complete();
  }
}
