import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
	IonContent,
	IonInput,
	IonButton,
	IonCard,
	IonCardContent
} from '@ionic/angular/standalone';
import { Auth } from '@angular/fire/auth';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
	selector: 'app-login',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		IonContent,
		IonInput,
		IonButton,
		IonCard,
		IonCardContent
	],
	templateUrl: './login.page.html',
	styleUrls: ['./login.page.scss']
})
export class LoginPage {

	email = '';
	password = '';
	logoSrc = '';

	constructor(
		private auth: Auth,
		private router: Router,
		private authService: AuthService
	) {}

	async ngOnInit() {
		const user = await this.authService.getCurrentUser();
		if (user) {
			this.router.navigateByUrl('/inicio');
		}

		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		this.logoSrc = prefersDark
			? 'assets/icon/logo_blanco.png'
			: 'assets/icon/logo_color.png';
	}

	async login() {
		const ok = await this.authService.login(this.email, this.password);
		if (ok) {
			this.router.navigateByUrl('/inicio');
		} else {
			alert('Correo o contraseña incorrectos');
		}
	}
}
