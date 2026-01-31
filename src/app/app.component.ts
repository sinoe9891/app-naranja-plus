import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonListHeader,
  IonNote,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  homeOutline,
  calendarOutline,
  peopleOutline,
  settingsOutline,
  logOutOutline
} from 'ionicons/icons';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { App } from '@capacitor/app';
import { Storage } from '@ionic/storage-angular';
import { AuthService } from './services/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonListHeader,
    IonNote,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterLink,
    IonRouterOutlet
  ]
})
export class AppComponent implements OnInit {
  public appPages: any[] = [];
  public usuarioEmail: string = '';
  public usuarioNombre: string = '';

  constructor(
    private auth: Auth,
    private router: Router,
    private storage: Storage,
    private authService: AuthService
  ) {
    addIcons({
      homeOutline,
      calendarOutline,
      peopleOutline,
      settingsOutline,
      logOutOutline
    });
  }

  private buildMenu(role: string) {
    this.appPages = [
      { title: 'Inicio', url: '/inicio', icon: 'home-outline' },
      { title: 'Eventos', url: '/events', icon: 'calendar-outline' },
      { title: 'Configuración', url: '/configuracion', icon: 'settings-outline' }
    ];

    if (role === 'superadmin') {
      this.appPages.splice(2, 0, { title: 'Usuarios', url: '/usuarios', icon: 'people-outline' });
    }
  }

  initializeApp() {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setOverlaysWebView({ overlay: false });
  }

  async ngOnInit() {
    await this.storage.create();

    // menú por rol
    const rol = (await this.storage.get('userRol')) || 'usuario';
    this.buildMenu(rol);

    // si hay credenciales, intentamos login
    const email = await this.storage.get('userEmail');
    const pass = await this.storage.get('userPass');

    if (email && pass && !this.authService.getCurrentUser()) {
      const ok = await this.authService.login(email, pass);
      if (ok) this.router.navigateByUrl('/inicio');
    }

    // auth state (solo para UI, NO tocar storage "user" aquí)
    onAuthStateChanged(this.auth, async (user: User | null) => {
      if (user) {
        this.usuarioEmail = user.email || '';

        const session = await this.storage.get('usuario');
        this.usuarioNombre =
          session?.firstName ||
          session?.fullName ||
          user.displayName ||
          '';

        const newRole = (await this.storage.get('userRol')) || 'usuario';
        this.buildMenu(newRole);
      } else {
        this.usuarioEmail = '';
        this.usuarioNombre = '';
        this.buildMenu('usuario');
      }
    });
  }

  async logout() {
    try {
      await this.authService.logout();
      await this.storage.clear();
      localStorage.clear();
      sessionStorage.clear();

      if ((window as any).Capacitor?.isNativePlatform()) {
        App.exitApp();
      } else {
        this.router.navigateByUrl('/login');
      }
    } catch (err) {
      console.error('❌ Error al cerrar sesión:', err);
    }
  }
}
