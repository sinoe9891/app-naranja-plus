import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonRow,
  IonCol,
  IonInput,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { ScannerService } from 'src/app/services/scanner/scanner.service';
import { Storage } from '@ionic/storage-angular';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-scan-input',
  templateUrl: './scan-input.page.html',
  styleUrls: ['./scan-input.page.scss'],
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
    IonInput,
    IonRefresher,
    IonRefresherContent,
    IonButton,
    IonIcon,
    IonButtons,
    IonBackButton
  ]
})
export class ScanInputPage implements OnInit {
  @ViewChild('in', { static: false }) myInput: any;

  texto = '';
  eventname = '';
  idevento = '';
  modoBanda = false;

  textoChange$ = new Subject<string>();
  defaultBackUrl: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private firestore: Firestore,
    private toast: ToastController,
    private loadingCtrl: LoadingController,
    private scannerService: ScannerService,
    private storage: Storage,
    private alertCtrl: AlertController
  ) {
    this.textoChange$.pipe(debounceTime(250)).subscribe(() => {
      this.cambio();
    });
  }

  private async initStorage() {
    await this.storage.create();
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

  /** ✅ NO cambia '-' a '_'  | solo limpia espacios / saltos de línea */
  private normalizeQr(raw: string): string {
    if (!raw) return '';

    // 1) trim
    let out = String(raw).trim();

    // 2) algunos scanners meten \n o espacios al final
    out = out.replace(/[\r\n\t ]+/g, '');

    // 3) Firestore docId NO puede llevar "/" porque rompe la ruta
    out = out.replace(/\//g, '');

    return out;
  }

  irAtras(ev: Event) {
    ev.preventDefault();
    this.router.navigateByUrl(this.defaultBackUrl);
  }

  ionViewWillEnter() {
    this.texto = '';
    setTimeout(() => this.myInput?.setFocus(), 300);
  }

  async ngOnInit() {
    await this.initStorage();

    this.idevento = this.route.snapshot.paramMap.get('id') || '';
    const tipo = this.route.snapshot.paramMap.get('tipo') || 'ticket';
    this.modoBanda = tipo === 'banda';

    this.eventname = await this.scannerService.getEventoNombre(this.idevento);

    // Validar evento exista (nuevo path)
    const eventoDocSnap = await getDoc(doc(this.firestore, 'events', this.idevento));
    if (!eventoDocSnap.exists()) {
      await this.presentAlert('Evento inválido', 'No se encontró el evento seleccionado.');
      this.router.navigateByUrl('/events');
      return;
    }

    this.defaultBackUrl = `/scanner/${this.idevento}`;
    setTimeout(() => this.myInput?.setFocus(), 300);
  }

  onTextoChange() {
    // ✅ Antes: reemplazaba "-" por "_"
    // ✅ Ahora: deja el QR tal cual y solo lo normaliza (trim, quita \n, etc.)
    this.texto = this.normalizeQr(this.texto);
    this.textoChange$.next(this.texto);
  }

  async cambio() {
    if (!this.texto) return;

    const loading = await this.loadingCtrl.create({
      message: 'Verificando...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      const correo = await this.getUserEmailFromStorage();
      if (!correo) {
        await this.presentToast('No se pudo recuperar tu email de sesión');
        return;
      }

      this.scannerService.scanUse = this.modoBanda ? 'banda' : 'ticket';
      this.scannerService.eventId = this.idevento;

      const ok = this.modoBanda
        ? await this.scannerService.verifyBandCode({
            qrData: this.texto,
            evento: this.idevento,
            usuario: correo
          })
        : await this.scannerService.verifyCode({
            qrData: this.texto,
            evento: this.idevento,
            usuario: correo
          });

      this.router.navigateByUrl('/resultado');

      if (!ok) this.texto = '';
    } catch (e) {
      console.error(e);
      await this.presentToast('❌ Ocurrió un error al validar');
    } finally {
      await loading.dismiss();
    }
  }

  async presentAlert(titulo: string, mensaje: string) {
    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      buttons: ['Aceptar']
    });
    await alert.present();
  }

  async presentToast(msg: string) {
    const toast = await this.toast.create({
      message: msg,
      duration: 2000,
      position: 'top'
    });
    toast.present();
  }

  handleRefresh(event: any) {
    this.texto = '';
    event.target.complete();
    this.presentToast('🔄 Recargado');
  }

  onContainerClick() {
    this.myInput.setFocus();
  }

  eventos() {
    this.router.navigateByUrl(`/scanner/${this.idevento}`);
  }
}
