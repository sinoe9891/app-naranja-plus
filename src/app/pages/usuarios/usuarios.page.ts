import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonRefresher,
  IonRefresherContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton
} from '@ionic/angular/standalone';

import { UserService } from 'src/app/services/user/user.service';
import { UserData } from 'src/app/interfaces/user.interface';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonRefresher,
    IonRefresherContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton
  ]
})
export class UsuariosPage implements OnInit {
  usuarios: UserData[] = [];
  usuariosFiltrados: UserData[] = [];
  cargando = false;

  filtro = '';
  filtroRol = '';

  // ✅ Nuevo set de roles (ajustá si querés)
  rolesDisponibles: string[] = ['superadmin', 'cliente', 'promotor', 'punto_venta', 'scanning'];

  // Paginación
  usuariosPorPagina = 10;
  paginaActual = 1;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit() {
    this.cargarUsuarios();
  }

  async cargarUsuarios(event?: any) {
    try {
      this.cargando = true;
      this.usuarios = await this.userService.getAllUsers(); // debe leer collection('users')
      this.filtrarUsuarios();
    } finally {
      this.cargando = false;
      if (event) event.target.complete();
    }
  }

  getDisplayEmail(u: UserData): string {
    return (u.email || u.correo || '').toString();
  }

  getDisplayRole(u: UserData): string {
    return ((u.role as any) || u.rol || 'usuario').toString();
  }

  getDisplayName(u: UserData): string {
    const first = (u.firstName || '').toString().trim();
    const last = (u.lastName || (u as any).lastname || '').toString().trim();
    const full = (u.fullName || '').toString().trim();

    const name = `${first} ${last}`.trim();
    return name || full || this.getDisplayEmail(u).split('@')[0] || 'Usuario';
  }

  filtrarUsuarios() {
    const texto = this.filtro.trim().toLowerCase();

    this.usuariosFiltrados = this.usuarios.filter(u => {
      const email = this.getDisplayEmail(u).toLowerCase();
      const name = this.getDisplayName(u).toLowerCase();
      const role = this.getDisplayRole(u);

      const coincideTexto =
        !texto ||
        name.includes(texto) ||
        email.includes(texto);

      const coincideRol =
        this.filtroRol ? role === this.filtroRol : true;

      return coincideTexto && coincideRol;
    });

    this.paginaActual = 1;
  }

  get usuariosPaginados() {
    const inicio = (this.paginaActual - 1) * this.usuariosPorPagina;
    return this.usuariosFiltrados.slice(inicio, inicio + this.usuariosPorPagina);
  }

  get totalPaginas() {
    return Math.ceil(this.usuariosFiltrados.length / this.usuariosPorPagina) || 1;
  }

  cambiarPagina(delta: number) {
    const nuevaPagina = this.paginaActual + delta;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
    }
  }

  editarUsuario(usuario: UserData) {
    // docId real
    const id = usuario.id || (usuario as any).uid || '';
    if (!id) return;
    this.router.navigate(['/edit-user', id]);
  }
}
