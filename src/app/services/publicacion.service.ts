import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { mensajeHttp } from './http-error';
import { GrupoDTO } from '../models/grupo.dto';
import { HorarioService } from './horario.service';
import { ParametroService } from './parametro.service';

@Injectable({ providedIn: 'root' })
export class PublicacionService {
  private http = inject(HttpClient);
  private horario = inject(HorarioService);
  private parametros = inject(ParametroService);
  private readonly api = environment.apiUrl;

  readonly error = signal('');

  private readonly publicadoBack = signal(false);
  private readonly idsPendientes = signal<number[]>([]);
  private readonly huellaPublicada = signal<string | null>(null);

  /** Foto de las sesiones: en modo mock, el horario deja de estar publicado si ésta cambia. */
  private readonly huella = computed(() =>
    JSON.stringify([this.horario.clases().map(c => [c.id, c.grupoId, c.dia, c.horaInicio, c.horaFin]), this.parametros.parametros()])
  );

  readonly publicado = computed(() =>
    environment.usarMock ? this.huellaPublicada() === this.huella() : this.publicadoBack()
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
    this.http.get<boolean>(`${this.api}/horario/estado`).subscribe({
      next: valor => this.publicadoBack.set(valor === true),
      error: e => this.error.set(this.mensajeError(e))
    });
  }

  async publicar(): Promise<string | null> {
    const faltan = this.pendientes().length;
    if (faltan) return `No se puede publicar: hay ${faltan} grupo(s) con sesiones pendientes.`;
    if (!this.horario.totalSesiones()) return 'No se puede publicar un horario sin sesiones.';
    const fuera = this.fueraDeHorario().length;
    if (fuera) return `No se puede publicar: hay ${fuera} sesión(es) fuera del horario configurado.`;
    if (environment.usarMock) {
      this.huellaPublicada.set(this.huella());
      return null;
    }
    try {
      await firstValueFrom(this.http.post(`${this.api}/horario/publicar`, null, { responseType: 'text' }));
    } catch (e) {
      return this.mensajeError(e);
    }
    this.cargar();
    return null;
  }

  private mensajeError(e: unknown): string {
    return mensajeHttp(e);
  }
}
