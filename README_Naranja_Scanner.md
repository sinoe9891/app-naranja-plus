# 📱 Naranja Scanner PLUS – Documentación Técnica Robusta & Prompt para ChatGPT

**Naranja Scanner PLUS** es una aplicación móvil híbrida desarrollada con **Ionic + Angular 19 + Capacitor 7**. Optimizada para el escaneo de códigos QR, estadísticas de uso, validación de boletos y funcionalidades offline/online. Forma parte de la suite tecnológica de **Naranja & Media**.

---

## 🧠 ¿Por qué usar este archivo como prompt?

Cuando lo usas con ChatGPT, este README proporciona el **contexto completo** de cómo funciona la app:

- Conexión entre vistas, servicios e interfaces.
- Arquitectura del código.
- Flujo de datos entre Firebase, interfaces y navegación.
- Mejores prácticas con Angular Standalone y Capacitor.

Esto permite a ChatGPT darte ayuda **precisa, contextualizada y técnica** sobre el proyecto.

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

## 📦 Estructura de Código y Flujo

### Páginas principales

- `inicio.page.ts` → Carga eventos asignados al usuario y navegación inicial.
- `usuarios.page.ts` → Gestión y listado de usuarios.
- `edit-user.page.ts` → Asignación de eventos y ubicaciones.
- `configuracion.page.ts` → Ajustes del usuario, modo oscuro, correo.
- `statistics.page.ts` → Métricas en tiempo real con Google Charts.
- `scan-input.page.ts` → Validación de códigos QR y registro de escaneos.
- `events.page.ts` → Lista y selección de eventos por usuario.

### Servicios y su función

| Servicio              | Propósito principal                                          |
|-----------------------|--------------------------------------------------------------|
| `auth.service.ts`     | Inicio de sesión, cierre y persistencia de autenticación.    |
| `user.service.ts`     | Consulta y edición de usuarios, asignación de roles/eventos. |
| `events.service.ts`   | Consulta y suscripción a eventos en Firestore.               |
| `big-data.service.ts` | Lógica de escaneo, recolección de métricas y visualización.  |

---

## 📄 Interfaces de Datos

### 🧾 Boleto

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

### 🎟 Evento

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

### 👤 Usuario

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

## ⚙️ Capacitor Configuración

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

## 🚀 Comandos Útiles

### Para iniciar desarrollo:
```bash
npm install
npm start


```

### Para generar Android:
```bash

#Exportar
Cambiar versión versionName "1.0.10" en /android/app/build.gradle
npx cap sync
npx cap sync android
ionic capacitor build android # Compilar para Android

npm run android:build
```

### Scripts recomendados (`package.json`):

```json
"scripts": {
  "build": "ng build --configuration production --output-path=www && cp -a www/browser/. www/ && rm -rf www/browser",
  "android:build": "rm -rf www && npm run build && npx cap sync android && ionic capacitor build android && npx cap open android"
}
```

### ¿Cuándo usar cada uno?

- `npx cap sync android`: Sincroniza cambios de configuración (`capacitor.config.ts`, plugins o íconos).
- `ionic capacitor build android`: Construye la app nativa Android (necesario después de `build`).
- `npx cap open android`: Abre el proyecto en Android Studio para emular o compilar.

---

## 💡 Funcionalidades Clave

✅ Formularios Reactivos  
✅ Componentes Angular Standalone  
✅ Escaneo QR con bitácora y estadísticas  
✅ Modo oscuro persistente  
✅ Alertas de confirmación antes de abandonar  
✅ Uso sin conexión con almacenamiento local  
✅ Optimizado para Android, soporte web disponible  

---

## 📎 Recomendaciones Técnicas

- Usa **Chrome DevTools** conectado al WebView para depurar en Android.
- No uses prerender (`index-hydrated.html`) ya que puede romper Firestore en Capacitor.
- Asegura tener configurado correctamente `@angular/fire` para evitar errores de tiempo real.

---

## 🤖 ¿Qué puede hacer ChatGPT con este README?

- Explicar cómo interactúan tus archivos y servicios.
- Crear nuevos componentes o servicios similares.
- Sugerir mejoras de seguridad, rendimiento o UX.
- Integrar nuevas funcionalidades como filtros, sincronización offline o reportes PDF.

---

## 🧡 Desarrollado por

**Danny Velásquez**  
[Naranja & Media](https://naranjaymediahn.com) – Honduras, 2025
