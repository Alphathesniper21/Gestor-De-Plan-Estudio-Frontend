import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AulaDTO } from '../models/aula.dto';
import { GrupoDTO } from '../models/grupo.dto';
import { MateriaDTO } from '../models/materia.dto';
import { ClaseHorario, Dia, NuevaClase } from '../models/horario.model';
import { AULAS_MOCK, GRUPOS_MOCK, MATERIAS_MOCK } from '../mock/horario.mock';

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly dias: Dia[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly horasGrilla = Array.from({ length: 15 }, (_, i) => i + 7);

  readonly materias = signal<MateriaDTO[]>(environment.usarMock ? MATERIAS_MOCK : []);
  readonly aulas = signal<AulaDTO[]>(environment.usarMock ? AULAS_MOCK : []);
  readonly errorApi = signal('');

  private readonly grupos = signal<GrupoDTO[]>(environment.usarMock ? GRUPOS_MOCK : []);
  private readonly colores = ['#f97316', '#2563eb', '#059669', '#7c3aed', '#db2777', '#0891b2', '#ca8a04'];

  readonly clases = computed(() => this.grupos().map(g => this.aClase(g)));
  readonly totalClases = computed(() => this.clases().length);
  readonly totalHoras = computed(() => this.clases().reduce((t, c) => t + c.horaFin - c.horaInicio, 0));
  readonly totalMaterias = computed(() => new Set(this.grupos().map(g => g.materiaId)).size);
  readonly totalAulas = computed(() => new Set(this.grupos().map(g => g.aulaId)).size);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (environment.usarMock) return;
    this.errorApi.set('');
    this.http.get<MateriaDTO[] | null>(`${this.api}/materia/mostrartodo`).subscribe({
      next: lista => this.materias.set(lista ?? []),
      error: e => this.errorApi.set(this.mensajeError(e))
    });
    this.http.get<AulaDTO[] | null>(`${this.api}/aula/mostrartodo`).subscribe({
      next: lista => this.aulas.set(lista ?? []),
      error: e => this.errorApi.set(this.mensajeError(e))
    });
    this.http.get<GrupoDTO[] | null>(`${this.api}/grupo/mostrarpordocente/${environment.docenteId}`).subscribe({
      next: lista => this.grupos.set(lista ?? []),
      error: e => this.errorApi.set(this.mensajeError(e))
    });
  }

  formatoHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  colorDe(codigo: number): string {
    return this.colores[Math.abs(codigo) % this.colores.length];
  }

  horasValidas(dia: Dia): number[] {
    if (dia === 'Sábado') return [7, 8, 9, 10];
    return [7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20];
  }

  async asignar(d: NuevaClase): Promise<string | null> {
    if (d.materiaId === null) return 'Selecciona la materia.';
    if (d.aulaId === null) return 'Selecciona el aula.';
    if (d.idGrupo === null || d.idGrupo < 1) return 'Ingresa el número del grupo.';
    if (d.cupoMaximo === null || d.cupoMaximo < 1) return 'Ingresa el cupo máximo.';
    if (!this.horasValidas(d.dia).includes(d.horaInicio)) {
      return 'Cada clase dura 2 horas, entre 07:00 y 22:00 (sábado hasta las 13:00) y sin cruzar 12:00-13:00.';
    }
    const horaFin = d.horaInicio + 2;
    const idGrupo = d.idGrupo;
    if (this.grupos().some(g => g.idGrupo === idGrupo)) return 'Ya existe un grupo con ese número.';
    const cruce = this.clases().some(c => c.dia === d.dia && d.horaInicio < c.horaFin && horaFin > c.horaInicio);
    if (cruce) return 'Ya tienes una clase asignada en ese horario.';

    const grupo: GrupoDTO = {
      idGrupo,
      materiaId: d.materiaId,
      docenteId: environment.docenteId,
      aulaId: d.aulaId,
      cupoMaximo: d.cupoMaximo,
      estudiantesInscritos: 0,
      diaSemana: d.dia,
      horaInicio: `${this.formatoHora(d.horaInicio)}:00`,
      horaFin: `${this.formatoHora(horaFin)}:00`
    };

    if (!environment.usarMock) {
      let params = new HttpParams();
      for (const [clave, valor] of Object.entries(grupo)) params = params.set(clave, String(valor));
      try {
        await firstValueFrom(this.http.post(`${this.api}/grupo/crear`, null, { params, responseType: 'text' }));
      } catch (e) {
        return this.mensajeError(e);
      }
    }
    this.grupos.update(lista => [...lista, grupo]);
    return null;
  }

  async eliminar(id: number): Promise<void> {
    if (!environment.usarMock) {
      try {
        await firstValueFrom(this.http.delete(`${this.api}/grupo/eliminar/${id}`, { responseType: 'text' }));
      } catch (e) {
        this.errorApi.set(this.mensajeError(e));
        return;
      }
    }
    this.grupos.update(lista => lista.filter(g => g.idGrupo !== id));
  }

  private aClase(g: GrupoDTO): ClaseHorario {
    const materia = this.materias().find(m => m.codigo === g.materiaId);
    return {
      id: g.idGrupo,
      materia: materia ? materia.nombre : `Materia ${g.materiaId}`,
      grupo: String(g.idGrupo),
      aula: `Aula ${g.aulaId}`,
      dia: this.aDia(g.diaSemana),
      horaInicio: parseInt(g.horaInicio.slice(0, 2), 10),
      horaFin: parseInt(g.horaFin.slice(0, 2), 10),
      color: this.colorDe(g.materiaId)
    };
  }

  private aDia(texto: string): Dia {
    const limpio = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    return this.dias.find(d => d.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === limpio) ?? 'Lunes';
  }

  private mensajeError(e: unknown): string {
    const err = e as HttpErrorResponse;
    if (typeof err.error === 'string' && err.error) return err.error;
    if (err.status === 401 || err.status === 403) return 'Sin permiso: falta iniciar sesión o el rol no permite esta acción.';
    return 'No se pudo conectar con el servidor.';
  }
}
