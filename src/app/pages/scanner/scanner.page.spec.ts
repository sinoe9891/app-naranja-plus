import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonRow,
  IonCol,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ScannerService } from 'src/app/services/scanner/scanner.service';
import { UserService } from 'src/app/services/user/user.service';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonRow,
    IonCol,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon
  ]
})
export class ScannerPage implements OnInit {
  eventname = '';
  eventId = '';

  super = false;
  cliente = false;
  puntoventa = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scannerService: ScannerService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') || '';

    const user = this.authService.getCurrentUser();
    if (user?.email) {
      const role = await this.userService.getUserRoleByEmail(user.email);
      this.super = role === 'superadmin';
      this.cliente = role === 'cliente';
      this.puntoventa = role === 'punto_venta';
    }

    if (this.eventId) {
      // ✅ nuevo: getEventoNombre ahora lee de "events" y retorna data.name
      this.eventname = await this.scannerService.getEventoNombre(this.eventId);
    }
  }

  scanearScanner(tipo: 'banda' | 'ticket' | 'general') {
    if (!this.eventId) {
      console.error('❌ No se encontró el ID del evento.');
      return;
    }
    this.router.navigate(['/scanner', this.eventId, tipo]);
  }

  analitics() {
    this.router.navigate(['/statistics', this.eventId]);
  }

  eventos() {
    this.router.navigate(['/events']);
  }
}
