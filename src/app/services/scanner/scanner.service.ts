import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { Boleto } from 'src/app/interfaces/boleto.interface';
import { UserData } from 'src/app/interfaces/user.interface';
import { Evento } from 'src/app/interfaces/evento.interface';

@Injectable({
  providedIn: 'root'
})
export class ScannerService {
  info: Boleto | null = null;
  resultado = '';
  estado = false;

  public doc: Evento | null = null;
  public scanUse: string = 'ticket';
  public eventId: string = '';
  public idticket: string = '';

  constructor(private firestore: Firestore) {}

  async getEventoNombre(eventId: string): Promise<string> {
    try {
      const eventoRef = doc(this.firestore, 'events', eventId);
      const snap = await getDoc(eventoRef);

      if (!snap.exists()) return 'Escáner de Evento';

      const data = snap.data() as any;

      // Guardamos el evento completo (con id) para ResultadoPage
      this.doc = { id: snap.id, ...data } as Evento;
      this.eventId = eventId;

      return data?.name || 'Escáner de Evento';
    } catch (error) {
      console.error('❌ Error obteniendo evento:', error);
      return 'Escáner de Evento';
    }
  }

  private async getUserByEmail(email: string): Promise<UserData | null> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as UserData;
  }

  private canScanEvent(user: UserData, eventId: string): boolean {
    const role = (user as any).role || (user as any).rol || '';
    const status = (user as any).status || 'active';

    if (status !== 'active') return false;

    // permissions puede venir como array ["*"] o map/objeto
    const permissions: any = (user as any).permissions;
    const hasAll =
      role === 'superadmin' ||
      (Array.isArray(permissions) && permissions.includes('*'));

    if (hasAll) return true;

    const assigned: string[] = Array.isArray((user as any).assignedEventId)
      ? (user as any).assignedEventId
      : [];

    return assigned.includes(eventId);
  }

  async verifyCode(enviar: { qrData: string; usuario: string; evento: string }): Promise<boolean> {
    const qr = (enviar.qrData || '').trim();
    if (!qr) {
      this.setError('El ticket no existe en el sistema');
      return false;
    }

    try {
      const usuarioCorreo = (enviar.usuario || '').trim().toLowerCase();
      if (!usuarioCorreo) {
        this.setError('No se pudo identificar el usuario');
        return false;
      }

      // Ref ticket NUEVO
      const ticketRef = doc(this.firestore, 'events', enviar.evento, 'tickets', qr);

      const [ticketSnap, userData] = await Promise.all([
        getDoc(ticketRef),
        this.getUserByEmail(usuarioCorreo)
      ]);

      if (!ticketSnap.exists()) {
        this.setError('El ticket no existe en el sistema');
        return false;
      }

      if (!userData) {
        this.setError('Tu usuario no existe en la colección users');
        return false;
      }

      if (!this.canScanEvent(userData, enviar.evento)) {
        this.setError('⛔ No tienes permisos para escanear en este evento');
        return false;
      }

      const ticketData = ticketSnap.data() as any;

      // Validación extra: ticket realmente pertenece al evento
      const ticketEventId = ticketData?.event?.id;
      if (ticketEventId && ticketEventId !== enviar.evento) {
        this.setError('⛔ Este ticket no pertenece a este evento', ticketData);
        return false;
      }

      // Ya escaneado
      if (ticketData?.scanned === true) {
        const by = ticketData?.scannedBy || 'otro usuario';
        this.setError(`⚠️ Ticket ya fue escaneado (${by})`, ticketData);
        return false;
      }

      // Marcar escaneo (mínimo necesario)
      await updateDoc(ticketRef, {
        scanned: true,
        scannedAt: serverTimestamp(),
        scannedBy: usuarioCorreo
      });

      // Variables para ResultadoPage
      this.info = ticketData as Boleto;
      this.eventId = enviar.evento;
      this.scanUse = 'ticket';

      // si existe ticketNumber, lo usamos como id visible
      this.idticket =
        (ticketData?.ticketNumber?.toString?.() || '') ||
        (ticketData?.invoiceNumber?.toString?.() || '') ||
        qr;

      this.setSuccess('✅ Ticket escaneado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en verifyCode:', error);
      this.setError('Hubo un error durante la verificación');
      return false;
    }
  }

  // Si no vas a usar “bandas” en el nuevo sistema, dejalo así por ahora (bloquea si ya escaneó)
  async verifyBandCode(enviar: { qrData: string; usuario: string; evento: string }): Promise<boolean> {
    this.scanUse = 'banda';
    return this.verifyCode({ qrData: enviar.qrData, usuario: enviar.usuario, evento: enviar.evento });
  }

  private setError(msg: string, info: any = null) {
    this.resultado = msg;
    this.estado = false;
    this.info = info;
  }

  private setSuccess(msg: string) {
    this.resultado = msg;
    this.estado = true;
  }
}
