# 📱 Naranja Scanner PLUS – Documentación Técnica

**Naranja Scanner PLUS** es una aplicación móvil híbrida desarrollada con **Ionic + Angular 19 + Capacitor 7**, diseñada para escaneo de códigos QR, validación de boletos, y visualización de estadísticas en tiempo real. Esta herramienta está optimizada para funcionar en entornos Android y cuenta con capacidades offline.

---

## 🧩 Stack Tecnológico

| Herramienta              | Versión/Detalles            |
|--------------------------|-----------------------------|
| Angular                  | v19                         |
| Ionic Framework          | v8.5.7                      |
| Capacitor                | v7.2.0                      |
| Firebase Firestore       | Realtime DB                 |
| Capacitor Storage        | Local Storage Persistente  |
| RxJS                     | v7.8.x                      |
| Google Charts            | Visualización de métricas   |
| Android Studio           | Compilación nativa Android  |

---

## 📁 Estructura del Proyecto

### Páginas Principales

- `inicio.page.ts`: Carga eventos asignados al usuario.
- `usuarios.page.ts`: Visualización y gestión de usuarios.
- `edit-user.page.ts`: Asignación de eventos y ubicaciones.
- `configuracion.page.ts`: Configuración del usuario, tema y datos personales.
- `statistics.page.ts`: Visualización de estadísticas.
- `scan-input.page.ts`: Escaneo QR y lógica de validación.
- `events.page.ts`: Listado de eventos disponibles.

### Servicios

| Servicio              | Función                                                         |
|-----------------------|------------------------------------------------------------------|
| `auth.service.ts`     | Manejo de sesión y autenticación.                               |
| `user.service.ts`     | Consulta y actualización de usuarios.                           |
| `events.service.ts`   | Manejo de eventos y suscripciones desde Firebase.               |
| `big-data.service.ts` | Procesamiento de escaneos, bitácora y estadísticas.             |

---

## 📄 Interfaces

### Boleto

```ts
export interface Boleto {
	escaneado?: boolean;
	codigo?: string;
	tipoboleto?: {
		localidad?: string;
		[key: string]: any;
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
```

### Evento

```ts
export interface Evento {
	id: string;
	nombreevento?: string;
	fechaevento?: string | number;
	direccionevento?: string;
	portada?: string;
	fechaeventofin?: number | string;
	estado?: boolean;
	archivar?: boolean;
	tipoboletoscreados?: boolean;
	tipolocalidades?: boolean;
	generarciondeboletos?: boolean;
}
```

### Usuario

```ts
export interface UserData {
	id?: string;
	correo: string;
	rol: 'promotor' | 'superadmin' | 'cliente' | string;
	name?: string;
	lastname?: string;
	identidad?: string;
	celular?: string;
	estado?: boolean;
	ubicacion?: string;
	cliente?: string;
	fecha_creacion?: string;
	eventosasignados?: {
		[eventoId: string]: string[]; // Ejemplo: { "evento123": ["VIP", "General"] }
	};
}
```

---

## ⚙️ Configuración de Capacitor

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.naranjamedia.scanner',
  appName: 'Naranja Scanner PLUS',
  webDir: 'www',
  bundledWebRuntime: false
};

export default config;
```

---

## 🚀 Comandos de Desarrollo y Producción

```bash
npm install       # Instala las dependencias
npm start         # Inicia servidor local para desarrollo
npm run build     # Compila el proyecto para producción
npm run android:build  # Build completo para Android
```

## 🚀 Compilar Android
```bash
ionic build --prod #Esto genera el bundle optimizado para subir a un hosting o PWA:

#Exportar
Cambiar versión versionName "1.0.10" en /android/app/build.gradle
npx cap sync
npx cap sync android
ionic capacitor build android # Compilar para Android

npx cap open android #Abrir proyecto en Android Studio
```

## 🚀 Modificar Versión
```bash


```ts
android/app/build.gradle
defaultConfig {
    applicationId "io.ionic.starter"
    minSdkVersion 22
    targetSdkVersion 34
    versionCode 1
    versionName "1.0.0" // ⬅️ Cambiá aquí la versión visible en App.getInfo()
}

```

### Scripts recomendados (`package.json`):

```json
"scripts": {
  "build": "ng build --configuration production --output-path=www && cp -a www/browser/. www/ && rm -rf www/browser",
  "android:build": "rm -rf www && npm run build && npx cap sync android && ionic capacitor build android && npx cap open android"
}
```

### ¿Cuándo usar?

- `npx cap sync android`: sincroniza plugins y cambios de configuración.
- `ionic capacitor build android`: compila la app Android desde Ionic.
- `npx cap open android`: abre el proyecto nativo en Android Studio.

---

## 📎 Observaciones Técnicas

- Proyecto optimizado para Android.
- Usa componentes Angular Standalone.
- Modo oscuro persistente mediante Capacitor Storage.
- Validación QR con lógica de bitácora y tiempos límite.
- Google Charts se utiliza para visualización de métricas.
- No incluye iOS por el momento.

---

## 🧡 Desarrollado por

**Danny Velásquez**  
Agencia [Naranja & Media](https://naranjaymediahn.com)  
Honduras, 2025
