import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, NgZone } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import { Firestore, collection, doc, query, where, onSnapshot, getDocs, CollectionReference, DocumentData } from '@angular/fire/firestore';
import { updateDoc } from 'firebase/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { BigDataService } from 'src/app/services/big-data/big-data.service';

import {
  IonList,
  IonItem,
  IonLabel,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonMenuButton,
  IonButtons  
} from '@ionic/angular/standalone';
declare var google: any;

@Component({
	selector: 'app-statistics',
	templateUrl: './statistics.page.html',
	styleUrls: ['./statistics.page.scss'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		IonList,
		IonItem,
		IonLabel,
		IonContent,
		IonHeader,
		IonTitle,
		IonToolbar,
		IonCard,
		IonCardHeader,
		IonCardTitle,
		IonCardContent,
		IonGrid,
		IonRow,
		IonCol,
		IonMenuButton,
		IonButtons
	]
})
export class StatisticsPage implements OnInit {
	eventname: string = '';
	eventId: string = '';
	datosBoletos: any[] = [];
	datosEvento: any;
	listaBoletos: any[] = [];
	esporlote: boolean = false;
	resumenUsuarios: any[] = [];
	resumenZonas: any[] = [];
	lotetotalboletos: number = 0;
	lotedocumentosgenerados: number = 0;
	lotedocumentosescaneados: number = 0;
	loteultimaverificacion: number = 0;
	resumenUsuariosBandas: any[] = [];
	bandasEscaneadas: number = 0;
	boletosEscaneados: number = 0;
	restantesTotales: number = 0;
	zonasPorUbicacion: any[] = [];
	unsubscribeSnapshot: () => void = () => { };

	constructor(
		private route: ActivatedRoute,
		private storage: Storage,
		private toast: ToastController,
		private firestore: Firestore,
		private router: Router,
		private bigData: BigDataService,
		private zone: NgZone,
		private alertController: AlertController
	) { }

	ngOnInit() {
		this.eventId = this.route.snapshot.paramMap.get('id') || '';
		console.log('📊 Evento ID desde URL:', this.eventId);
	}

	async ionViewWillEnter() {
		await this.loadEventName();
		const eventoSnap = await getDocs(query(collection(this.firestore, 'eventos'), where('idevento', '==', this.eventId)));
		eventoSnap.forEach(doc => {
			this.bandasEscaneadas = doc.data()['bandasEscaneadas'] || 0;
		});

		await this.getTipoBoletos();
		await this.cargarResumenEscaneos();
	}

	async loadEventName() {
		this.eventname = await this.storage.get("selectedEventName") || '';
		console.log("Nombre del evento:", this.eventname);
	}

	back() {
		this.router.navigateByUrl('/home');
	}

	showChart(rows: any[]) {
		const data = new google.visualization.DataTable();
		data.addColumn('string', 'Tipo de boleto');
		data.addColumn('number', 'Total');
		data.addRows(rows);

		const options = {
			title: 'Uso de boletos total',
			width: 350,
			height: 250
		};

		const chart = new google.visualization.PieChart(document.getElementById('chart_div'));
		chart.draw(data, options);
	}
	async cargarResumenEscaneos() {
		const boletosRef = collection(this.firestore, 'eventos', this.eventId, 'boletos');

		onSnapshot(boletosRef, (snapshot) => {
			const usuariosBoletos = new Map<string, { total: number; zonas: Map<string, number> }>();
			const usuariosBandas = new Map<string, { total: number; zonas: Map<string, number> }>();
			const conteoEscaneadosPorZona = new Map<string, number>();
			const zonasUbicacion = new Map<string, number>();

			snapshot.forEach(doc => {
				const data = doc.data();
				const usuario = data['usuario'] || 'Desconocido';
				const localidad = data?.["tipoboleto"]?.["localidad"] || 'Sin Zona';
				const ubicacion = data?.["ubicacion"] || 'Sin Ubicación';
				const bitacora = data["bitacora"];

				if (Array.isArray(bitacora) && bitacora.length > 0) {
					// Banda
					if (!usuariosBandas.has(usuario)) {
						usuariosBandas.set(usuario, { total: 0, zonas: new Map() });
					}
					const userData = usuariosBandas.get(usuario)!;
					userData.total += 1;
					userData.zonas.set(localidad, (userData.zonas.get(localidad) || 0) + 1);

					// Suma por localidad
					conteoEscaneadosPorZona.set(localidad, (conteoEscaneadosPorZona.get(localidad) || 0) + 1);

					// Suma por ubicación
					zonasUbicacion.set(ubicacion, (zonasUbicacion.get(ubicacion) || 0) + 1);

				} else if (data["escaneado"] === true) {
					// Boleto individual
					if (!usuariosBoletos.has(usuario)) {
						usuariosBoletos.set(usuario, { total: 0, zonas: new Map() });
					}
					const userData = usuariosBoletos.get(usuario)!;
					userData.total += 1;
					userData.zonas.set(localidad, (userData.zonas.get(localidad) || 0) + 1);

					// Suma por localidad
					conteoEscaneadosPorZona.set(localidad, (conteoEscaneadosPorZona.get(localidad) || 0) + 1);

					// Suma por ubicación
					zonasUbicacion.set(ubicacion, (zonasUbicacion.get(ubicacion) || 0) + 1);
				}
			});

			// Resumen por usuario
			this.resumenUsuarios = Array.from(usuariosBoletos.entries()).map(([usuario, data]) => ({
				usuario,
				total: data.total,
				zonas: Array.from(data.zonas.entries()).map(([localidad, cantidad]) => ({ localidad, cantidad }))
			}));

			this.resumenUsuariosBandas = Array.from(usuariosBandas.entries()).map(([usuario, data]) => ({
				usuario,
				total: data.total,
				zonas: Array.from(data.zonas.entries()).map(([localidad, cantidad]) => ({ localidad, cantidad }))
			}));

			// Boletos restantes por zona
			this.listaBoletos = this.listaBoletos.map(boleto => {
				const zona = boleto["nombretipo"];
				const total = boleto["cantidadtipo"] || 0;
				const usados = conteoEscaneadosPorZona.get(zona) || 0;
				return {
					...boleto,
					restantes: total - usados
				};
			});

			// Zonas por ubicación
			this.zonasPorUbicacion = Array.from(zonasUbicacion.entries()).map(([ubicacion, cantidad]) => ({
				ubicacion,
				cantidad
			}));
		});
	}



	showSecondGraph() {
		const data = new google.visualization.DataTable();
		data.addColumn('string', 'Hora');
		data.addColumn('number', 'General');
		data.addColumn('number', 'VIP');

		data.addRows([
			['16:00', 2000, 10],
			['17:00', 1523, 8],
			['18:00', 500, 50],
			['19:00', 869, 37]
		]);

		const options = {
			title: 'Uso de boletos por hora',
			width: 2000,
			height: 300,
			legend: { position: 'bottom' },
			hAxis: { title: 'Hora' },
			vAxis: { title: 'Vendidos' }
		};

		const chart = new google.visualization.LineChart(document.getElementById('second_chart_div'));
		chart.draw(data, options);
		this.bigData.loading.dismiss();
	}

	async presentToast(mensaje: string) {
		const toast = await this.toast.create({ message: mensaje, duration: 3000 });
		toast.present();
	}

	async getTipoBoletos() {
		this.datosEvento = null;
		this.listaBoletos = [];
		this.datosBoletos = [];

		const tipoboletosRef = collection(this.firestore, 'tipoboletos') as CollectionReference<DocumentData>;
		const q = query(tipoboletosRef, where('ideventoseleccionado', '==', this.eventId));

		onSnapshot(q, (snapshot) => {
			this.datosBoletos = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			this.datosEvento = this.datosBoletos.find(e => e.ideventoseleccionado === this.eventId);
			this.listaBoletos = this.datosEvento?.tiposdeboleto || [];
			this.esporlote = !this.datosEvento?.cantidadtipodeboleto;

			if (this.esporlote) this.esporlotefunction();
		});

	}


	esporlotefunction() {
		this.lotetotalboletos = this.listaBoletos.reduce((total, b) => total + (b.cantidadtipo || 0), 0);

		const eventoDoc = doc(this.firestore, 'eventos', this.eventId);
		this.unsubscribeSnapshot = onSnapshot(eventoDoc, (docSnap) => {
			const data = docSnap.data();
			this.lotedocumentosgenerados = data?.['documentosgenerados'] || 0;
			this.lotedocumentosescaneados = data?.['documentosescaneados'] || 0;
			this.bandasEscaneadas = data?.['bandasEscaneadas'] || 0;

			// Calcular boletos escaneados
			this.boletosEscaneados = this.lotedocumentosescaneados - this.bandasEscaneadas;

			// Calcular restantes
			this.restantesTotales = this.lotedocumentosgenerados - this.lotedocumentosescaneados;

			this.zone.run(() => { });
		});
	}


	async datadocumentos() {
		const alert = await this.alertController.create({
			header: "Alerta",
			message: "Esta función generará un costo adicional. Puede tardar más de 5 minutos.",
			buttons: [
				{ text: "Cancelar", role: 'cancel' },
				{
					text: 'Sí',
					handler: async () => {
						try {
							await this.bigData.presentLoadinginfinite();

							const boletosRef = collection(this.firestore, 'eventos', this.eventId, 'boletos');
							const snap = await getDocs(boletosRef); // ✅ snapshot definido correctamente aquí
							const eventoRef = doc(this.firestore, 'eventos', this.eventId);

							// Crear set para contar bandas únicas
							const bandasEscaneadasUnicas = new Set<string>();

							snap.forEach(doc => {
								const data = doc.data();
								const bitacora = data['bitacora'];

								if (Array.isArray(bitacora) && bitacora.length > 1) {
									bandasEscaneadasUnicas.add(doc.id); // id = código del boleto/banda
								}
							});

							await updateDoc(eventoRef, {
								documentosescaneados: snap.size,
								bandasEscaneadas: bandasEscaneadasUnicas.size,
								ultimaverificacion: Date.now()
							});
							this.bandasEscaneadas = bandasEscaneadasUnicas.size;

							await this.bigData.loading.dismiss();
							this.presentAlert("ÉXITO", "Datos verificados con éxito");
						} catch (e) {
							console.error("❌ Error verificando documentos:", e);
							this.presentToast("Hubo un error al verificar documentos");
							await this.bigData.loading.dismiss();
						}
					}
				}
			]
		});
		await alert.present();
	}



	async dataescaneado() {
		const alert = await this.alertController.create({
			header: "Alerta",
			message: "Esta función generará un costo adicional. Puede tardar más de 5 minutos.",
			buttons: [
				{ text: "Cancelar", role: 'cancel' },
				{
					text: 'Sí',
					handler: async () => {
						try {
							await this.bigData.presentLoadinginfinite();

							const boletosRef = collection(this.firestore, 'eventos', this.eventId, 'boletos');
							const q = query(boletosRef, where('escaneado', '==', true));
							const snap = await getDocs(q);

							const usuariosMap = new Map<string, { total: number; zonas: Map<string, number> }>();
							const bandasMap = new Map<string, number>();
							const bandasUnicas = new Set<string>();

							snap.forEach(doc => {
								const data = doc.data();
								const localidad = data?.['tipoboleto']?.['localidad'] || 'Sin Zona';
								const bitacora = data['bitacora'];

								if (Array.isArray(bitacora) && bitacora.length > 0) {
									bandasUnicas.add(doc.id); // ✅ solo una vez por banda
									bitacora.forEach(b => {
										const u = b.usuario || 'Desconocido';
										bandasMap.set(localidad, (bandasMap.get(localidad) || 0) + 1);
									});
								} else {
									const usuario = data['usuario'] || 'Desconocido';
									if (!usuariosMap.has(usuario)) {
										usuariosMap.set(usuario, { total: 0, zonas: new Map() });
									}
									const userData = usuariosMap.get(usuario)!;
									userData.total += 1;
									userData.zonas.set(localidad, (userData.zonas.get(localidad) || 0) + 1);
								}
							});


							this.resumenUsuarios = Array.from(usuariosMap.entries()).map(([usuario, data]) => ({
								usuario,
								total: data.total,
								zonas: Array.from(data.zonas.entries()).map(([localidad, cantidad]) => ({ localidad, cantidad }))
							}));

							this.resumenZonas = Array.from(bandasMap.entries()).map(([localidad, cantidad]) => ({
								localidad,
								cantidad
							}));

							const eventoRef = doc(this.firestore, 'eventos', this.eventId);
							await updateDoc(eventoRef, {
								documentosescaneados: snap.size,
								bandasEscaneadas: bandasUnicas.size,
								ultimaverificacion: Date.now()
							});
							this.bandasEscaneadas = bandasUnicas.size;


							await this.bigData.loading.dismiss();
							this.presentAlert("ÉXITO", "Escaneados actualizados con éxito");

						} catch (error) {
							console.error('❌ Error actualizando escaneados:', error);
							await this.bigData.loading.dismiss();
							this.presentToast("Hubo un error al verificar escaneos");
						}
					}
				}
			]
		});
		await alert.present();
	}



	async presentAlert(header: string, message: string) {
		const alert = await this.alertController.create({ header, message, buttons: ['Ok'] });
		await alert.present();
	}

	ionViewWillLeave() {
		if (this.unsubscribeSnapshot) {
			this.unsubscribeSnapshot(); // detiene el listener en tiempo real
		}
	}
}