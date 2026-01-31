export interface Boleto {
	escaneado?: boolean;
	codigo?: string;
	tipoboleto?: {
		localidad?: string;
		[key: string]: any;
	};
	tipolocalidad?: {
		ubicacion?: string;
	};
	numeroboleto?: number;
	usuario?: string;
	ubicacion?: string;
	horaUsado?: number;
	bitacora?: BitacoraEntry[];
	[key: string]: any;
	fechaboletoinicio?: number; // En milisegundos
	fechaboletofinal?: number;  // En milisegundos
}

export interface BitacoraEntry {
	usuario: string;
	fecha: number;
	ubicacion: string;
}
