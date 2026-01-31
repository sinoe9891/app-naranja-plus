import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc, updateDoc, Firestore } from '@angular/fire/firestore';
import { Storage } from '@ionic/storage-angular';
import { NavController } from '@ionic/angular';

@Component({
	selector: 'app-configuracion',
	standalone: true,
	imports: [CommonModule, IonicModule, ReactiveFormsModule],
	templateUrl: './configuracion.page.html',
	styleUrls: ['./configuracion.page.scss'],
})

export class ConfiguracionPage implements OnInit {
	private firestore: Firestore = inject(Firestore);
	private route: ActivatedRoute = inject(ActivatedRoute);
	private fb: FormBuilder = inject(FormBuilder);
	private router: Router = inject(Router);
	private toastCtrl: ToastController = inject(ToastController);
	private alertCtrl: AlertController = inject(AlertController);
	private storage: Storage = inject(Storage);

	constructor(
		private navCtrl: NavController // ✅ inyectado correctamente aquí
	) { }
	openCargaCodigos() {
		this.navCtrl.navigateForward('/cargar-codigos');
	}
	userForm: FormGroup = this.fb.group({
		name: ['', Validators.required],
		lastname: ['', Validators.required],
		correo: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
		estado: [true, Validators.required], // valor por defecto y requerido
		theme: [false, Validators.required],
	});

	userId!: string;
	isDisabled: boolean = true;
	VersionNumber!: string;

	async ngOnInit() {
		await this.storage.create();

		const user = await this.storage.get('usuario');
		console.log('📦 Contenido de usuario en Storage:', user);

		if (user?.uid) {
			this.userId = user.uid;
			this.loadUser(this.userId);
		} else {
			console.warn('⚠️ No se encontró usuario en Storage o está incompleto');
			this.presentAlert('No se pudo cargar la información del usuario.');
		}

		this.userForm = this.fb.group({
			name: ['', Validators.required],
			lastname: ['', Validators.required],
			correo: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
			estado: [{ value: '', disabled: true }, Validators.required],
			theme: [false, Validators.required],
		});


		// Solo obtener versión si no estamos en web
		if (Capacitor.isNativePlatform()) {
			App.getInfo().then(info => {
				this.VersionNumber = info.version;
			});
		} else {
			this.VersionNumber = 'Versión Web';
		}
		const savedTheme = await this.storage.get('color-theme');
		if (savedTheme) {
			document.body.setAttribute('color-theme', savedTheme);
		}
		this.route.params.subscribe(async params => {
			const paramId = params['id'];

			if (paramId) {
				this.userId = paramId;
				await this.loadUser(this.userId);
			} else {
				const user = await this.storage.get('usuario');
				if (user?.uid) {
					this.userId = user.uid;
					await this.loadUser(this.userId);
				}
			}
		});

	}

	async loadUser(userId: string) {
		try {
			console.log('Obteniendo usuario con ID:', userId);
			const ref = doc(this.firestore, `users/${userId}`);
			const snap = await getDoc(ref);

			if (snap.exists()) {
				const data = snap.data() as any;
				data.id = snap.id; // ✅ Esto sí garantiza que tengas el ID del documento

				// Puedes asignarlo como respaldo
				if (!this.userId) {
					this.userId = data.id;
					console.log('📍 userId tomado desde snap.id:', this.userId);
				}

				this.userForm.patchValue({
					name: data.name ?? '',
					lastname: data.lastname ?? '',
					correo: data.correo ?? '',
					estado: data.estado === true || data.estado === 'true',
					theme: data.theme ?? false,
				});
				const theme = data.theme ? 'dark' : 'light';
				document.body.setAttribute('color-theme', theme);
				this.storage.set('color-theme', theme);
				this.isDisabled = false;
			} else {
				console.warn('Usuario no encontrado.');
				this.presentToast('El usuario no existe.');
			}
		} catch (err) {
			console.error('Error al obtener usuario:', err);
			this.presentToast('Error al obtener datos del usuario.');
		}
	}

	async updateUser() {
		if (!this.userId) {
			console.error('❌ No hay userId definido al intentar actualizar');
			this.presentAlert('Error: No se ha encontrado el ID del usuario.');
			return;
		}

		if (this.userForm.invalid) return;

		const confirm = await this.alertCtrl.create({
			header: 'Actualizar',
			message: '¿Desea guardar los cambios?',
			buttons: [
				{ text: 'Cancelar', role: 'cancel' },
				{
					text: 'Guardar',
					handler: async () => {
						try {
							const ref = doc(this.firestore, `users/${this.userId}`);
							await updateDoc(ref, this.userForm.getRawValue());
							console.log('Usuario actualizado con:', this.userForm.getRawValue());
							this.presentAlert('Actualización exitosa.');
						} catch (err) {
							console.error('Error al actualizar:', err);
							this.presentAlert('Error al actualizar.');
						}
					},
				},
			],
		});

		await confirm.present();
	}

	onToggleColorTheme(event: CustomEvent) {
		const theme = event.detail.checked ? 'dark' : 'light';
		document.body.setAttribute('color-theme', theme);
		this.storage.set('color-theme', theme); // ✅ Guarda localmente
	}


	handleRefresh(event: any) {
		setTimeout(() => {
			this.loadUser(this.userId);
			event.target.complete();
		}, 1000);
	}

	async presentToast(message: string) {
		const toast = await this.toastCtrl.create({
			message,
			duration: 2000,
		});
		await toast.present();
	}
	onThemeChange(event: CustomEvent) {
		const isDark = event.detail.value === true;
		const theme = isDark ? 'dark' : 'light';
		document.body.setAttribute('color-theme', theme);
		this.storage.set('color-theme', theme);
	}
	async presentAlert(message: string) {
		const alert = await this.alertCtrl.create({
			header: 'Atención',
			message,
			buttons: ['OK'],
		});
		await alert.present();
	}
}
