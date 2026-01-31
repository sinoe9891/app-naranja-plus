import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { UserData } from 'src/app/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firestore: Firestore) {}

  /** Obtener user por UID (docId) */
  async getUserByUid(uid: string): Promise<UserData | null> {
    const ref = doc(this.firestore, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    return { id: snap.id, ...(snap.data() as any) } as UserData;
  }

  /** Role por UID */
  async getUserRole(uid: string): Promise<string> {
    const user = await this.getUserByUid(uid);
    return (user?.role || user?.rol || 'usuario') as string;
  }

  /** Role por email (NUEVO: users.email) */
  async getUserRoleByEmail(email: string): Promise<string> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return 'usuario';

    const data = snapshot.docs[0].data() as UserData;
    return (data.role || data.rol || 'usuario') as string;
  }

  /** Data completa por email (NUEVO: users.email) */
  async getUserDataByEmail(email: string): Promise<UserData | null> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const d = snapshot.docs[0];
    return { id: d.id, ...(d.data() as any) } as UserData;
  }

  async getAllUsers(): Promise<UserData[]> {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);

    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as UserData));
  }
}
