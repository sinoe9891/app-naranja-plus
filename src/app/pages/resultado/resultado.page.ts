import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { BigDataService } from 'src/app/services/big-data/big-data.service';
import { ScannerService } from 'src/app/services/scanner/scanner.service';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-resultado',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './resultado.page.html',
  styleUrls: ['./resultado.page.scss'],
})
export class ResultadoPage implements OnInit, OnDestroy {
  texto = '';
  estado = false;
  info: any = null;
  status = false;

  eventname = '';
  idticket = '';

  userEmail = '';

  private countdownInterval: any;
  private redireccionCancelada = false;

  constructor(
    private router: Router,
    public toast: ToastController,
    public bigData: BigDataService,
    public scannerService: ScannerService,
    private storage: Storage
  ) {}

  ngOnDestroy() {
    clearInterval(this.countdownInterval);
  }

  private async getUserEmailFromStorage(): Promise<string> {
    const usuarioObj = await this.storage.get('usuario');
    if (usuarioObj?.email) return String(usuarioObj.email).toLowerCase();

    const user = await this.storage.get('user');
    if (typeof user === 'string') return user.toLowerCase();
    if (user?.email && typeof user.email === 'string') return user.email.toLowerCase();
    if (user?.email?.email) return String(user.email.email).toLowerCase();

    const email = await this.storage.get('userEmail');
    if (email) return String(email).toLowerCase();

    return '';
  }

  private syncFromScannerService() {
    const doc: any = this.scannerService.doc;

    this.eventname =
      doc?.name ||
      doc?.nombreevento ||
      'Resultado Escaneo';

    this.texto = this.scannerService.resultado;
    this.estado = this.scannerService.estado;
    this.info = this.scannerService.info;
    this.idticket = this.scannerService.idticket;
  }

  async ngOnInit() {
    await this.storage.create();
    this.syncFromScannerService();
    this.userEmail = await this.getUserEmailFromStorage();
  }

  cancelarRedireccion() {
    this.redireccionCancelada = true;
    clearInterval(this.countdownInterval);
  }

  async ionViewWillEnter() {
    this.redireccionCancelada = false;
    this.syncFromScannerService();
    this.userEmail = await this.getUserEmailFromStorage();

    if (this.estado) {
      let countdown = 0;
      const tipo = this.scannerService.scanUse || 'ticket';
      const eventId = this.scannerService.eventId || '';

      clearInterval(this.countdownInterval);
      this.countdownInterval = setInterval(() => {
        if (this.redireccionCancelada) {
          clearInterval(this.countdownInterval);
          return;
        }

        countdown--;

        if (countdown < 0) {
          clearInterval(this.countdownInterval);
          this.router.navigateByUrl(`/scanner/${eventId}/${tipo}`, { replaceUrl: true });
        }
      }, 1000);
    }
  }

  newscan() {
    this.cancelarRedireccion();
    this.scannerService.resultado = '';
    this.scannerService.estado = false;
    this.scannerService.info = null;

    const tipo = this.scannerService.scanUse || 'ticket';
    const eventId = this.scannerService.eventId || '';
    this.router.navigateByUrl(`/scanner/${eventId}/${tipo}`, { replaceUrl: true });
  }

  scanagain() {
    this.cancelarRedireccion();
    this.scannerService.resultado = '';
    this.scannerService.estado = false;
    this.scannerService.info = null;

    this.router.navigateByUrl(`/scanner/${this.scannerService.eventId}/${this.scannerService.scanUse}`);
  }

  volveramenu() {
    this.cancelarRedireccion();
    this.router.navigateByUrl('/events');
  }

  verInfo() {
    this.cancelarRedireccion();
    this.status = !this.status;
  }

  // =========================
  // ✅ Helpers FECHAS (para quitar NG9)
  // =========================

  private toDate(value: any): Date | null {
    if (!value) return null;

    // Firestore Timestamp (AngularFire) -> tiene toDate()
    if (typeof value === 'object' && typeof value.toDate === 'function') {
      return value.toDate();
    }

    // Timestamp-like {seconds, nanoseconds}
    if (typeof value === 'object' && typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000);
    }

    // unix seconds o ms
    if (typeof value === 'number') {
      const ms = value < 1e12 ? value * 1000 : value;
      const d = new Date(ms);
      return Number.isFinite(d.getTime()) ? d : null;
    }

    // ISO string
    if (typeof value === 'string') {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? new Date(ms) : null;
    }

    return null;
  }

  /** usadoAt: scannedAt (nuevo) o horaUsado (viejo) */
  getUsedAt(info: any): any {
    return info?.scannedAt ?? info?.horaUsado ?? null;
  }

  calcularDia(value: any) {
    const d = this.toDate(value);
    return d ? d.getDate() : '';
  }

  calcularMes(value: any) {
    const d = this.toDate(value);
    if (!d) return '';
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return meses[d.getMonth()];
  }

  calcularAnio(value: any) {
    const d = this.toDate(value);
    return d ? d.getFullYear() : '';
  }

  calcularHora(value: any) {
    const d = this.toDate(value);
    return d ? d.toLocaleString('es-HN', { hour: 'numeric', minute: 'numeric', hour12: true }) : '';
  }

  calcularDiaSemana(value: any) {
    const d = this.toDate(value);
    if (!d) return '';
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return dias[d.getDay()];
  }
}
