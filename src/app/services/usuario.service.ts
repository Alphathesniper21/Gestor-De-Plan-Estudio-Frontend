import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RolUsuario, UsuarioDTO } from '../models/usuario.dto';

export interface NuevoUsuario {
  nombre: string;
  correo: string;
  username: string;
  password: string;
  rol: RolUsuario;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly usuarios = signal<UsuarioDTO[]>(
    environment.usarMock
      ? [
          { id: 1, nombre: 'Gestor de prueba', correo: 'gestor@unbosque.edu.co', username: 'gestor', rol: 'GESTOR' },
          { id: 2, nombre: 'Consultante de prueba', correo: 'consulta@unbosque.edu.co', username: 'consultante', rol: 'CONSULTANTE' }
        ]
      : []
  );
  readonly cargando = signal(false);
  readonly errorApi = signal('');

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (environment.usarMock) return;
    this.cargando.set(true);
    this.errorApi.set('');
    this.http.get<UsuarioDTO[] | null>(`${this.api}/usuario/mostrartodo`).subscribe({
      next: lista => this.usuarios.set(lista ?? []),
      error: e => this.errorApi.set(this.mensajeError(e))
    }).add(() => this.cargando.set(false));
  }

  async crear(u: NuevoUsuario): Promise<string | null> {
    if (!u.nombre.trim() || !u.correo.trim() || !u.username.trim() || !u.password.trim()) {
      return 'Completa todos los campos.';
    }
    if (!environment.usarMock) {
      const error = await this.llamar('POST', '/usuario/crear', { ...u });
      if (error) return error;
      this.cargar();
      return null;
    }
    const id = this.usuarios().reduce((max, x) => Math.max(max, x.id), 0) + 1;
    this.usuarios.update(l => [...l, { id, nombre: u.nombre, correo: u.correo, username: u.username, rol: u.rol }]);
    return null;
  }

  async eliminar(id: number): Promise<string | null> {
    if (!environment.usarMock) {
      const error = await this.llamar('DELETE', `/usuario/eliminar/${id}`);
      if (error) return error;
    }
    this.usuarios.update(l => l.filter(u => u.id !== id));
    return null;
  }

  private async llamar(metodo: 'POST' | 'DELETE', ruta: string, datos: Record<string, string | number | boolean> = {}): Promise<string | null> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(datos)) params = params.set(clave, String(valor));
    try {
      await firstValueFrom(this.http.request(metodo, `${this.api}${ruta}`, { params, responseType: 'text' }));
      return null;
    } catch (e) {
      return this.mensajeError(e);
    }
  }

  private mensajeError(e: unknown): string {
    const err = e as HttpErrorResponse;
    if (typeof err.error === 'string' && err.error) return err.error;
    if (err.status === 403) return 'Tu rol no tiene permiso para esta acción.';
    return 'No se pudo conectar con el servidor.';
  }
}
