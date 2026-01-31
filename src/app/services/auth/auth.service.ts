import { Injectable } from '@angular/core';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { SessionUser, UserData } from 'src/app/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = getAuth();
  private currentUser: User | null = null;

  private storageReady: Promise<void>;

  constructor(
    private toast: ToastController,
    private storage: Storage
  ) {
    this.storageReady = this.initStorage();

    this.storageReady.then(() => {
      this.autoLogin();
    });

    onAuthStateChanged(this.auth, async user => {
      this.currentUser = user;
      await this.storageReady;

      if (!user) return;

      // 🔁 Si ya hay sesión guardada pero está incompleta/vieja, la rehidratamos
      const existing: SessionUser | null = await this.storage.get('usuario');

      const needsHydrate =
        !existing ||
        existing.email !== (user.email ?? '') ||
        existing.role === 'usuario' ||
        (!existing.firstName && !existing.fullName);

      if (needsHydrate) {
        await this.hydrateSessionFromFirestore(user.uid, user.email ?? '');
      }
    });
  }

  private async initStorage() {
    await this.storage.create();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  private async hydrateSessionFromFirestore(uid: string, emailFallback: string) {
    const db = getFirestore();
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    const userData = userSnap.exists()
      ? ({ id: userSnap.id, ...(userSnap.data() as any) } as UserData)
      : null;

    const role = (userData?.role || userData?.rol || 'usuario') as string;
    const status = (userData?.status || 'active') as string;

    if (status !== 'active') {
      await this.storage.remove('userEmail');
      await this.storage.remove('userPass');
      await this.storage.remove('user');
      await this.storage.remove('usuario');
      await this.storage.remove('userRol');
      throw new Error('USER_INACTIVE');
    }

    const fullNameFromDb =
      userData?.fullName ||
      `${userData?.firstName ?? ''} ${userData?.lastName ?? ''}`.trim();

    const session: SessionUser = {
      uid,
      email: userData?.email ?? emailFallback ?? '',
      role,
      status,
      fullName: fullNameFromDb || '',
      firstName: userData?.firstName ?? '',
      lastName: userData?.lastName ?? '',
      assignedEventId: Array.isArray(userData?.assignedEventId) ? userData!.assignedEventId : [],
      permissions: userData?.permissions ?? []
    };

    // ✅ Storage consistente
    await this.storage.set('userRol', role);
    await this.storage.set('usuario', session);

    // "user" lo dejamos como objeto simple y consistente
    await this.storage.set('user', {
      uid: session.uid,
      email: session.email,
      role: session.role,
      fullName: session.fullName,
      firstName: session.firstName
    });

    console.log('✅ Sesión hidratada desde Firestore:', session);
  }

  private async autoLogin() {
    const email = await this.storage.get('userEmail');
    const password = await this.storage.get('userPass');

    if (email && password && !this.auth.currentUser) {
      try {
        const credential = await signInWithEmailAndPassword(this.auth, email, password);
        this.currentUser = credential.user;

        await this.hydrateSessionFromFirestore(credential.user.uid, email);

        this.mostrarToast('🔐 Sesión restaurada automáticamente');
      } catch (error) {
        console.warn('⚠️ Falló la restauración automática:', error);
        await this.storage.remove('userEmail');
        await this.storage.remove('userPass');
        await this.storage.remove('user');
        await this.storage.remove('usuario');
        await this.storage.remove('userRol');
      }
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser = credential.user;

      await this.hydrateSessionFromFirestore(credential.user.uid, email);

      await this.storage.set('userEmail', email);
      await this.storage.set('userPass', password);

      this.mostrarToast('✅ Conectado como: ' + email);
      return true;

    } catch (error: any) {
      if (String(error?.message || '').includes('USER_INACTIVE')) {
        await signOut(this.auth);
        await this.mostrarToast('⛔ Usuario inactivo');
        return false;
      }

      console.error('Login error:', error);
      return false;
    }
  }

  async logout() {
    await signOut(this.auth);
    this.currentUser = null;

    await this.storage.remove('userEmail');
    await this.storage.remove('userPass');
    await this.storage.remove('userRol');
    await this.storage.remove('user');
    await this.storage.remove('usuario');
  }

  private async mostrarToast(mensaje: string) {
    const toast = await this.toast.create({
      message: mensaje,
      duration: 2500,
      color: 'success'
    });
    toast.present();
  }
}
