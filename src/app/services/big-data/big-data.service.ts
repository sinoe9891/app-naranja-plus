import { inject, Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, getDoc, setDoc, query, where, updateDoc, increment } from '@angular/fire/firestore';
import { LoadingController, ToastController } from '@ionic/angular';
import { Subscription, BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { onSnapshot } from 'firebase/firestore';
// Interfaces
import { Evento } from '../../interfaces/evento.interface';
import { UserData } from '../../interfaces/user.interface';
import { Boleto } from '../../interfaces/boleto.interface';
import { arrayUnion } from 'firebase/firestore';

@Injectable({
	providedIn: 'root'
})
export class BigDataService {
	resultado = '';
	estado = false;
	info: Boleto | null = null;
	loading: any = null;
	comingFrom = '';
	scanUse = '';
	backEvent: Subscription | null = null;
	eventId = '';
	doc: any = null;
	paises: any[] = [];
	doc_comments: number[] = [];
	ideventoseleccionado: any = null;
	tipoticket: any = null;
	idticket = '';
	boletosRealtimeSubscription: Subscription | null = null;
	boletosUnsubscribe: (() => void) | null = null;
	eventosRealtimeSubscription: (() => void) | null = null;
	boletos: Boleto[] = [];

	private objectSource = new BehaviorSubject<{}>({});
	$getObjectSource = this.objectSource.asObservable();

	constructor(
		private firestore: Firestore,
		private loadingCtr: LoadingController,
		private toastCtr: ToastController,
		private storage: Storage
	) { }

	/** Comunicación entre componentes */
	sendObjectSource(data: any) {
		this.objectSource.next(data);
	}
	async testFirebaseConnection() {
		const ref = collection(this.firestore, 'eventos');
		const snapshot = await getDocs(ref);

		console.log('✅ Lista de eventos en Firebase:');
		snapshot.forEach(doc => {
			//   console.log(`📌 ${doc.id}:`, doc.data());
		});
	}

	subscribeToBoletos(eventId: string) {
		const boletosRef = collection(this.firestore, 'eventos', eventId, 'boletos');

		// Cancela si ya hay una suscripción activa
		if (this.boletosUnsubscribe) {
			this.boletosUnsubscribe();
		}

		// Nueva suscripción
		this.boletosUnsubscribe = onSnapshot(boletosRef, (snapshot) => {
			this.boletos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Boleto));
			console.log('🎯 Boletos actualizados en tiempo real:', this.boletos);
		});
	}
	/** Obtener todos los eventos disponibles (debug o admin) */
	

	/** Obtener rol por UID */
	async getUserRole(uid: string): Promise<string> {
		const userRef = doc(this.firestore, 'users', uid);
		const userSnap = await getDoc(userRef);
		return userSnap.exists() ? (userSnap.data() as UserData).rol || 'usuario' : 'usuario';
	}

	/** Agregar usuario */
	addUser(user: UserData): Promise<void> {
		if (!user.id) return Promise.reject('El ID del usuario es requerido');
		return setDoc(doc(this.firestore, 'users', user.id), user);
	}


	async presentLoading() {
		this.loading = await this.loadingCtr.create({ spinner: null, cssClass: 'custom-loading', animated: true, duration: 1000 });
		this.loading.present();
	}

	async presentLoadinginfinite() {
		this.loading = await this.loadingCtr.create({ spinner: null, cssClass: 'custom-loading', animated: true });
		this.loading.present();
	}

	// 🔸 Setters para estado e info
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