import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';

@Injectable({
	providedIn: 'root'
})
export class RoleGuard implements CanActivate {
	constructor(private storage: Storage, private router: Router) {}

	async canActivate(): Promise<boolean> {
		await this.storage.create();
		const rol = await this.storage.get('userRol');

		if (rol === 'superadmin') {
			return true;
		}

		this.router.navigateByUrl('/inicio');
		return false;
	}
}
