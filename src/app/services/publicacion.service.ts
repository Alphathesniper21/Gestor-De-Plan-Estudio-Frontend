import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { mensajeHttp } from './http-error';
import { GrupoDTO } from '../models/grupo.dto';
import { HorarioService } from './horario.service';

@Injectable({ providedIn: 'root' })
export class PublicacionService {
  private http = inject(HttpClient);
  private horario = inject(HorarioService);
  private readonly api = environment.apiUrl;

  readonly error = signal('');

  private readonly idsPendientes = signal<number[]>([]);

  /**
   * El horario está publicado cuando no queda ninguna sesión en borrador (mock o sesiones locales)
   * o cuando el back lo indica. Crear o mover una sesión la deja en borrador y lo despublica.
   */
  readonly publicado = computed(() =>
    environment.usarMock ? this.horario.totalSesiones() > 0 && this.horario.sinPublicar() === 0 : this.horario.publicadoBack()
  );

  /** Sesiones que quedaron fuera de la jornada o dentro de la pausa con los parámetros actuales. */
  readonly fueraDeHorario = this.horario.clasesFueraDeHorario;

  /** Grupos que aún no tienen todas las sesiones de su materia (RF11). */
  readonly pendientes = computed(() => {
    const filas = this.horario.filasGrupos();
    if (environment.usarMock) return filas.filter(f => f.sesiones < f.maxSesiones);
    const ids = this.idsPendientes();
    return filas.filter(f => ids.includes(f.grupo.id));
  });

  cargar(): void {
    if (environment.usarMock) return;
    this.error.set('');
    this.http.get<GrupoDTO[] | null>(`${this.api}/horario/pendientes`).subscribe({
      next: lista => this.idsPendientes.set((lista ?? []).map(g => g.id)),
      error: e => this.error.set(this.mensajeError(e))
    });
    this.horario.cargarEstado();
  }

  async publicar(): Promise<string | null> {
    const faltan = this.pendientes().length;
    if (faltan) return `No se puede publicar: hay ${faltan} grupo(s) con sesiones pendientes.`;
    if (!this.horario.totalSesiones()) return 'No se puede publicar un horario sin sesiones.';
    const fuera = this.fueraDeHorario().length;
    if (fuera) return `No se puede publicar: hay ${fuera} sesión(es) fuera del horario configurado.`;
    if (environment.usarMock) {
      this.horario.marcarTodasPublicadas();
      return null;
    }
    try {
      await firstValueFrom(this.http.post(`${this.api}/horario/publicar`, null, { responseType: 'text' }));
    } catch (e) {
      return this.mensajeError(e);
    }
    this.horario.marcarTodasPublicadas();
    this.cargar();
    this.horario.cargar();
    return null;
  }

  private mensajeError(e: unknown): string {
    return mensajeHttp(e);
  }
}
