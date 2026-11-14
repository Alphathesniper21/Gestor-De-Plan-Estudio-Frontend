import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, RolUsuario } from '../models/usuario.dto';
import { formulario } from './http-form';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem('token'));
  readonly rol = signal<RolUsuario | null>(localStorage.getItem('rol') as RolUsuario | null);
  readonly usuario = signal(localStorage.getItem('usuario') ?? '');

  readonly logueado = computed(() => !!this.token());
  readonly esGestor = computed(() => this.rol() === 'GESTOR');
  readonly iniciales = computed(() => (this.usuario().slice(0, 2) || '??').toUpperCase());

  async login(nombreUsuario: string, contrasenia: string): Promise<string | null> {
    if (!nombreUsuario.trim() || !contrasenia.trim()) return 'Ingresa tu usuario y contraseña.';
    if (environment.usarMock) {
      const rol: RolUsuario = nombreUsuario.toLowerCase().includes('consult') ? 'CONSULTANTE' : 'GESTOR';
      this.guardar({ token: 'mock-token', rol }, nombreUsuario);
      return null;
    }
    try {
      const respuesta = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, formulario({ nombreUsuario, contrasenia }))
      );
      this.guardar(respuesta, nombreUsuario);
      return null;
    } catch (e) {
      const err = e as HttpErrorResponse;
      if (err.status === 401) return 'Credenciales inválidas.';
      return typeof err.error === 'string' && err.error ? err.error : 'No se pudo conectar con el servidor.';
    }
  }

  logout(): void {
    this.cerrarSesionLocal();
    this.router.navigate(['/login']);
  }

  /** Borra la sesión del navegador sin navegar (útil dentro de un guard). */
  cerrarSesionLocal(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('usuario');
    this.token.set(null);
    this.rol.set(null);
    this.usuario.set('');
  }

  /**
   * Hay token y, si es un JWT con claim "exp", todavía no venció. Si el token
   * no se puede leer (p. ej. el de modo mock) se asume vigente: el back decide.
   */
  sesionValida(): boolean {
    const token = this.token();
    if (!token) return false;
    const exp = this.expiracion(token);
    return exp === null || exp * 1000 > Date.now();
  }

  private expiracion(token: string): number | null {
    try {
      const carga = token.split('.')[1];
      if (!carga) return null;
      const exp = JSON.parse(atob(carga.replace(/-/g, '+').replace(/_/g, '/'))).exp;
      return typeof exp === 'number' ? exp : null;
    } catch {
      return null;
    }
  }

  private guardar(respuesta: AuthResponse, usuario: string): void {
    localStorage.setItem('token', respuesta.token);
    localStorage.setItem('rol', respuesta.rol);
    localStorage.setItem('usuario', usuario);
    this.token.set(respuesta.token);
    this.rol.set(respuesta.rol);
    this.usuario.set(usuario);
  }
}
