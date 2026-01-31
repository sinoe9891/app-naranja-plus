export type UserRole =
  | 'superadmin'
  | 'punto_venta'
  | 'promotor'
  | 'cliente'
  | string;

export interface UserData {
  /** UID del usuario (docId) */
  id?: string;

  /** Nuevo esquema */
  email: string;
  role: UserRole;
  status?: 'active' | 'inactive' | string;

  fullName?: string;
  firstName?: string;
  lastName?: string;

  phone?: string;
  address?: string;

  /** IDs de eventos asignados */
  assignedEventId?: string[];

  /** Puede venir como array ["*"] o map; lo dejamos flexible */
  permissions?: any;

  /** Compatibilidad vieja (por si aún hay pantallas no migradas) */
  correo?: string;
  rol?: string;
  ubicacion?: string;
  eventosasignados?: { [eventoId: string]: string[] };

  [key: string]: any;
}

/** Lo que guardamos en Storage para sesión */
export interface SessionUser {
  uid: string;
  email: string;
  role: UserRole;
  status?: string;

  fullName?: string;
  firstName?: string;
  lastName?: string;

  assignedEventId?: string[];
  permissions?: any;
}
