import { Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'login',
		pathMatch: 'full',
	},
	{
		path: 'login',
		loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
	},
	{
		path: 'register',
		loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
	},
	{
		path: 'usuarios',
		canActivate: [RoleGuard],
		loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage)
	},
	{
		path: 'configuracion',
		loadComponent: () => import('./pages/configuracion/configuracion.page').then(m => m.ConfiguracionPage)
	},
	{
		path: 'inicio',
		loadComponent: () => import('./pages/inicio/inicio.page').then(m => m.InicioPage)
	},
	{
		path: 'events',
		loadComponent: () => import('./pages/events/events.page').then(m => m.EventsPage)
	},
	{
		path: 'scanner',
		children: [
			{
				path: '',
				loadComponent: () => import('./pages/scanner/scanner.page').then(m => m.ScannerPage)
			},
			{
				path: ':id',
				loadComponent: () => import('./pages/scanner/scanner.page').then(m => m.ScannerPage)
			},
			{
				path: ':id/:tipo',
				loadComponent: () => import('./pages/scan-input/scan-input.page').then(m => m.ScanInputPage)
			}
		]
	},
	{
		path: 'resultado',
		loadComponent: () => import('./pages/resultado/resultado.page').then(m => m.ResultadoPage)
	},
	{
		path: 'statistics/:id',
		loadComponent: () => import('./pages/statistics/statistics.page').then(m => m.StatisticsPage)
	},
	{
		path: 'edit-user/:id',
		loadComponent: () => import('./pages/edit-user/edit-user.page').then(m => m.EditUserPage)
	},
  {
    path: 'cargar-codigos',
    loadComponent: () => import('./pages/cargar-codigos/cargar-codigos.page').then( m => m.CargarCodigosPage)
  }
];
