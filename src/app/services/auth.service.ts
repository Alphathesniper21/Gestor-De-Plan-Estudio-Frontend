import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, RolUsuario } from '../models/usuario.dto';

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
      const params = new HttpParams().set('nombreUsuario', nombreUsuario).set('contrasenia', contrasenia);
      const respuesta = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, null, { params })
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
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('usuario');
    this.token.set(null);
    this.rol.set(null);
    this.usuario.set('');
    this.router.navigate(['/login']);
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
