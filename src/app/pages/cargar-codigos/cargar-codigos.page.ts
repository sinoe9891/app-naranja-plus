import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage-angular';
import { Firestore, collection, getDocs, doc, getDoc } from '@angular/fire/firestore';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
	selector: 'app-cargar-codigos',
	standalone: true,
	imports: [CommonModule, IonicModule, FormsModule],
	templateUrl: './cargar-codigos.page.html',
})
export class CargarCodigosPage implements OnInit {
	eventos: any[] = [];
	eventoSeleccionado: string = '';

	constructor(
		private firestore: Firestore,
		private authService: AuthService,
		private storage: Storage,
		private toastCtrl: ToastController
	) {}

	async ngOnInit() {
		await this.storage.create();

		try {
			const user = await this.authService.getCurrentUser();

			if (!user) {
				console.warn('⚠️ Usuario no autenticado');
				return;
			}

			const uid = user.uid;
			console.log('🔐 UID del usuario:', uid);

			const userDocRef = doc(this.firestore, 'users', uid);
			const userSnap = await getDoc(userDocRef);

			if (!userSnap.exists()) {
				console.warn('⚠️ Documento del usuario no encontrado');
				return;
			}

			const userData = userSnap.data();
			const eventosAsignadosMap = userData['eventosasignados'];

			if (!eventosAsignadosMap || Object.keys(eventosAsignadosMap).length === 0) {
				console.warn('⚠️ No hay eventos asignados al usuario');
				return;
			}

			// Obtener todos los eventos de la colección
			const eventosCol = collection(this.firestore, 'eventos');
			const snapshot = await getDocs(eventosCol);

			this.eventos = snapshot.docs
				.filter(doc => eventosAsignadosMap.hasOwnProperty(doc.id))
				.map(doc => ({
					id: doc.id,
					nombre: doc.data()['nombreevento'] || 'Sin nombre'
				}));

			console.log('📋 Eventos asignados al usuario:', this.eventos);
		} catch (error) {
			console.error('❌ Error al cargar eventos asignados:', error);
		}
	}

	async cargarBoletosDesdeFirebase() {
		if (!this.eventoSeleccionado) return;

		try {
			const boletosCol = collection(this.firestore, `eventos/${this.eventoSeleccionado}/boletos`);
			const snapshot = await getDocs(boletosCol);

			const boletos: any = {};
			snapshot.forEach(docSnap => {
				boletos[docSnap.id] = docSnap.data();
			});

			console.log('📥 Boletos cargados desde Firestore:', boletos);
			await this.storage.set(`tickets_${this.eventoSeleccionado}`, boletos);
			this.toast(`Boletos cargados (${Object.keys(boletos).length})`);
		} catch (error) {
			console.error('❌ Error al cargar boletos desde Firestore:', error);
			this.toast('Error al cargar boletos.');
		}
	}

	async onFileChosen(event: any) {
		const file = event.target.files[0];
		const text = await file.text();
		const boletos = JSON.parse(text);

		await this.storage.set(`tickets_${this.eventoSeleccionado}`, boletos);
		console.log('📄 Boletos cargados desde JSON:', boletos);
		this.toast('Boletos cargados desde JSON');
	}

	private async toast(msg: string) {
		const toast = await this.toastCtrl.create({ message: msg, duration: 2000 });
		toast.present();
	}
}
