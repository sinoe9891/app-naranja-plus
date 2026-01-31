import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormsModule, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonList
} from '@ionic/angular/standalone';
import { AlertController, ToastController } from '@ionic/angular';
import { Firestore, doc, getDoc, updateDoc, collection, getDocs } from '@angular/fire/firestore';
import { UserData } from 'src/app/interfaces/user.interface';
import { CommonModule } from '@angular/common';

type StatusValue = 'active' | 'inactive';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.page.html',
  styleUrls: ['./edit-user.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonList
  ]
})
export class EditUserPage implements OnInit, OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private fb: FormBuilder = inject(FormBuilder);
  private alertCtrl: AlertController = inject(AlertController);
  private toastCtrl: ToastController = inject(ToastController);

  userForm: FormGroup;
  userId!: string;

  unsavedChanges = false;

  // ✅ roles nuevos
  roles = ['superadmin', 'cliente', 'promotor', 'punto_venta', 'scanning'];

  // ✅ status nuevo (active/inactive) — pero tu form sigue usando "estado"
  estados: Array<{ label: string; value: StatusValue }> = [
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' }
  ];

  // ✅ events nuevos
  eventosList: Array<{ id: string; name: string; zones?: any[] }> = [];
  selectedEvents: string[] = [];

  // Zonas asignadas por evento (para compatibilidad con tu scanner actual)
  ubicacionesAsignadasMap = new Map<string, string[]>();

  // ✅ para quitar listener bien
  private beforeUnloadBound = (event: BeforeUnloadEvent) => this.beforeUnloadHandler(event);

  constructor() {
    // ⚠️ Mantengo nombres viejos del form para que tu HTML actual no se rompa
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      lastname: ['', Validators.required],
      correo: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      rol: ['', Validators.required],
      estado: ['active', Validators.required], // ahora será 'active' | 'inactive'
      eventosasignados: [[]]
    });

    this.userForm.valueChanges.subscribe(() => {
      this.unsavedChanges = true;
    });
  }

  async ngOnInit() {
    this.route.params.subscribe(params => {
      this.userId = params['id'];
      if (this.userId) {
        this.loadUser(this.userId);
        this.loadEventos();
      }
    });

    window.addEventListener('beforeunload', this.beforeUnloadBound);
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.beforeUnloadBound);
  }

  private beforeUnloadHandler(event: BeforeUnloadEvent) {
    if (this.unsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /** ✅ Cargar usuario por docId (uid) */
  async loadUser(id: string) {
    try {
      const userRef = doc(this.firestore, 'users', id);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        this.presentToast('Usuario no encontrado');
        return;
      }

      const data = userSnap.data() as (UserData & Record<string, any>);

      // ✅ nombres nuevos + fallback viejo
      const firstName = (data.firstName ?? data['name'] ?? '').toString();
      const lastName = (data.lastName ?? data['lastname'] ?? '').toString();
      const email = (data.email ?? data['correo'] ?? '').toString();

      const role = (data.role ?? data['rol'] ?? 'cliente').toString();
      const status: StatusValue =
        (data.status as any) ||
        (typeof data['estado'] === 'boolean' ? (data['estado'] ? 'active' : 'inactive') : 'active');

      // ✅ eventos asignados nuevos + fallback viejo
      const assignedEventId: string[] = Array.isArray((data as any).assignedEventId)
        ? (data as any).assignedEventId
        : [];

      const legacyEventosObj: Record<string, string[]> = data.eventosasignados || {};

      this.selectedEvents =
        assignedEventId.length > 0
          ? assignedEventId
          : Object.keys(legacyEventosObj);

      // ✅ cargar zonas asignadas (nuevo: permissions.events[eventId].zones) o viejo eventosasignados[eventId]
      this.ubicacionesAsignadasMap.clear();

      const perm = (data.permissions ?? null) as any;
      const permEvents = perm?.events || {};

      for (const eventoId of this.selectedEvents) {
        const zonesFromPerm: string[] = Array.isArray(permEvents?.[eventoId]?.zones)
          ? permEvents[eventoId].zones
          : [];

        const zonesFromLegacy: string[] = Array.isArray(legacyEventosObj?.[eventoId])
          ? legacyEventosObj[eventoId]
          : [];

        const zones = zonesFromPerm.length > 0 ? zonesFromPerm : (zonesFromLegacy.length > 0 ? zonesFromLegacy : ['ACCESO TOTAL']);
        this.ubicacionesAsignadasMap.set(eventoId, zones);
      }

      this.userForm.patchValue({
        name: firstName,
        lastname: lastName,
        correo: email,
        rol: role,
        estado: status,
        eventosasignados: this.selectedEvents
      });

      this.unsavedChanges = false;
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar usuario');
    }
  }

  /** ✅ Cargar events activos */
  async loadEventos() {
    try {
      const eventsRef = collection(this.firestore, 'events');
      const snapshot = await getDocs(eventsRef);

      this.eventosList = snapshot.docs
        .map(d => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: (data.name || data.showName || 'Evento').toString(),
            zones: Array.isArray(data.zones) ? data.zones : []
          };
        })
        .filter(ev => true); // si querés filtrar por status active, lo hacemos aquí
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar eventos');
    }
  }

  getNombreEvento(eventoId: string): string {
    const evento = this.eventosList.find(e => e.id === eventoId);
    return evento ? evento.name : 'Evento desconocido';
  }

  /** ✅ Selector de eventos asignados */
  async seleccionarEventos() {
    const inputs = this.eventosList.map(evento => ({
      name: evento.id,
      type: 'checkbox' as const,
      label: evento.name,
      value: evento.id,
      checked: this.selectedEvents.includes(evento.id)
    }));

    const alert = await this.alertCtrl.create({
      header: 'Selecciona eventos asignados',
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (selectedEventos: string[]) => {
            this.selectedEvents = Array.isArray(selectedEventos) ? selectedEventos : [];
            this.userForm.get('eventosasignados')?.setValue(this.selectedEvents);

            // limpiar zonas de eventos ya no asignados
            for (const key of Array.from(this.ubicacionesAsignadasMap.keys())) {
              if (!this.selectedEvents.includes(key)) this.ubicacionesAsignadasMap.delete(key);
            }

            this.unsavedChanges = true;
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /** ✅ Editar zonas (desde events.zones[].name) */
  async editarUbicacionesEvento(eventoId: string) {
    try {
      const eventoDoc = await getDoc(doc(this.firestore, 'events', eventoId));
      if (!eventoDoc.exists()) {
        this.presentToast('Evento no encontrado');
        return;
      }

      const eventoData = eventoDoc.data() as any;

      const zonesArr: any[] = Array.isArray(eventoData?.zones) ? eventoData.zones : [];
      const zoneNames: string[] = zonesArr
        .map(z => (z?.name ?? '').toString().trim())
        .filter(Boolean);

      if (zoneNames.length === 0) {
        this.presentToast('Este evento no tiene zonas definidas');
        return;
      }

      const asignadas = this.ubicacionesAsignadasMap.get(eventoId) || [];

      const inputs = zoneNames.map((z: string) => ({
        name: z,
        type: 'checkbox' as const,
        label: z,
        value: z,
        checked: asignadas.includes(z)
      }));

      const alert = await this.alertCtrl.create({
        header: `Zonas para ${eventoData?.name || 'evento'}`,
        inputs,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Guardar',
            handler: (selectedZones: string[]) => {
              const zones = Array.isArray(selectedZones) && selectedZones.length > 0 ? selectedZones : ['ACCESO TOTAL'];
              this.ubicacionesAsignadasMap.set(eventoId, zones);
              this.unsavedChanges = true;
              return true;
            }
          }
        ]
      });

      await alert.present();
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar zonas');
    }
  }

  async eliminarEventoAsignado(eventoId: string) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: `¿Eliminar el evento "${this.getNombreEvento(eventoId)}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: () => {
            this.selectedEvents = this.selectedEvents.filter(id => id !== eventoId);
            this.userForm.get('eventosasignados')?.setValue(this.selectedEvents);
            this.ubicacionesAsignadasMap.delete(eventoId);
            this.unsavedChanges = true;
          }
        }
      ]
    });
    await alert.present();
  }

  /** ✅ Guardar (nuevo esquema + compatibilidad vieja para scanner) */
  async updateUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const raw = this.userForm.getRawValue();

    const firstName = (raw.name || '').toString().trim();
    const lastName = (raw.lastname || '').toString().trim();
    const email = (raw.correo || '').toString().trim().toLowerCase();

    const role = (raw.rol || 'cliente').toString().trim();
    const status: StatusValue = (raw.estado || 'active') as StatusValue;

    const selected: string[] = Array.isArray(raw.eventosasignados) ? raw.eventosasignados : [];

    // ✅ legacy map para tu scanner actual (si todavía usa eventosasignados)
    const legacyEventosasignados: Record<string, string[]> = {};
    selected.forEach(eventId => {
      legacyEventosasignados[eventId] = this.ubicacionesAsignadasMap.get(eventId) || ['ACCESO TOTAL'];
    });

    // ✅ permissions.events[eventId].zones
    const permissions = {
      events: selected.reduce((acc: any, eventId: string) => {
        acc[eventId] = { zones: this.ubicacionesAsignadasMap.get(eventId) || ['ACCESO TOTAL'] };
        return acc;
      }, {})
    };

    const payload: any = {
      // nuevo esquema
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email,
      role,
      status,
      assignedEventId: selected,
      permissions,

      // compatibilidad vieja (por si alguna pantalla aún lo usa)
      rol: role,
      correo: email,
      estado: status === 'active',
      eventosasignados: legacyEventosasignados
    };

    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: '¿Guardar cambios?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async () => {
            try {
              const docRef = doc(this.firestore, 'users', this.userId);
              await updateDoc(docRef, payload);

              this.unsavedChanges = false;

              const ok = await this.alertCtrl.create({
                header: 'Éxito',
                message: 'Usuario actualizado correctamente',
                buttons: ['OK']
              });
              await ok.present();

              this.router.navigate(['/usuarios']);
            } catch (error) {
              console.error(error);
              this.presentToast('Error al actualizar usuario');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
}
