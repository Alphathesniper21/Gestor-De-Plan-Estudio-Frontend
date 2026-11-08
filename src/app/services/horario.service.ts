import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { GrupoDTO } from '../models/grupo.dto';
import { MateriaDTO, NuevaMateria } from '../models/materia.dto';
import { SesionDTO } from '../models/sesion.dto';
import { ClaseHorario, Dia, NuevaSesion } from '../models/horario.model';
import { GRUPOS_MOCK, MATERIAS_MOCK, SESIONES_MOCK } from '../mock/horario.mock';

const CUPO_MAXIMO = 44;
const LOCAL_KEY = 'sesiones-local';
const MSG_GRUPOS = 'El back exige rol ADMIN para crear o eliminar grupos, pero ese rol ya no existe. Pendiente de ajustar en el back.';

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly dias: Dia[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly horasGrilla = Array.from({ length: 15 }, (_, i) => i + 7);
  readonly cupoMaximo = CUPO_MAXIMO;
  readonly avisoSesiones = !environment.usarMock && !environment.sesionesEnBack;

  readonly materias = signal<MateriaDTO[]>(environment.usarMock ? MATERIAS_MOCK : []);
  readonly grupos = signal<GrupoDTO[]>(environment.usarMock ? GRUPOS_MOCK : []);
  readonly errorApi = signal('');
  readonly cargando = signal(false);

  private pendientes = 0;
  private readonly sesiones = signal<SesionDTO[]>(environment.usarMock ? SESIONES_MOCK : this.leerLocal());
  private readonly colores = ['#f97316', '#2563eb', '#059669', '#7c3aed', '#db2777', '#0891b2', '#ca8a04'];

  readonly clases = computed(() =>
    this.sesiones().flatMap(s => {
      const clase = this.aClase(s);
      return clase ? [clase] : [];
    })
  );
  readonly totalMaterias = computed(() => this.materias().length);
  readonly totalGrupos = computed(() => this.grupos().length);
  readonly totalSesiones = computed(() => this.clases().length);
  readonly totalHoras = computed(() => this.clases().reduce((t, c) => t + c.horaFin - c.horaInicio, 0));
  readonly porDia = computed(() =>
    this.dias.map(d => ({ dia: d, sesiones: this.clases().filter(c => c.dia === d).length }))
  );

  readonly gruposEtiquetados = computed(() =>
    this.grupos().map(g => ({ id: g.id, etiqueta: `${this.nombreMateria(g.materiaId)} · Grupo ${g.numeroGrupo}` }))
  );

  readonly filasGrupos = computed(() =>
    this.grupos().map(g => ({
      grupo: g,
      materia: this.nombreMateria(g.materiaId),
      sesiones: this.sesiones().filter(s => s.grupoId === g.id).length,
      maxSesiones: this.maxSesiones(g)
    }))
  );

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (environment.usarMock) return;
    this.errorApi.set('');
    this.pendientes = environment.sesionesEnBack ? 3 : 2;
    this.cargando.set(true);
    this.cargarMaterias();
    this.cargarGrupos();
    if (environment.sesionesEnBack) this.cargarSesiones();
  }

  formatoHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  colorDe(materiaId: number): string {
    return this.colores[Math.abs(materiaId) % this.colores.length];
  }

  materiaDeGrupo(grupoId: number | null): number {
    return this.grupos().find(g => g.id === grupoId)?.materiaId ?? 0;
  }

  horasValidas(dia: Dia): number[] {
    if (dia === 'Sábado') return [7, 8, 9, 10];
    return [7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20];
  }

  async crearMateria(m: NuevaMateria): Promise<string | null> {
    if (!m.nombre.trim()) return 'Ingresa el nombre de la materia.';
    if (m.semestre < 1 || m.ncreditos < 1 || m.horasDeLaMateria < 2) return 'Revisa semestre, créditos y horas.';
    if (!environment.usarMock) {
      const error = await this.llamar('POST', '/materia/crear', { ...m });
      if (error) return error;
      this.cargarMaterias();
      return null;
    }
    this.materias.update(l => [...l, { ...m, id: this.siguienteId(l) }]);
    return null;
  }

  async actualizarMateria(m: MateriaDTO): Promise<string | null> {
    if (!m.nombre.trim()) return 'Ingresa el nombre de la materia.';
    if (m.semestre < 1 || m.ncreditos < 1 || m.horasDeLaMateria < 2) return 'Revisa semestre, créditos y horas.';
    if (!environment.usarMock) {
      const error = await this.llamar('PUT', '/materia/actualizar', {
        id: m.id,
        nombre: m.nombre,
        semestre: m.semestre,
        ncreditos: m.ncreditos,
        horasDeLaMateria: m.horasDeLaMateria,
        correlativa: m.correlativa
      });
      if (error) return error;
      this.cargarMaterias();
      return null;
    }
    this.materias.update(l => l.map(x => (x.id === m.id ? { ...m } : x)));
    return null;
  }

  async eliminarMateria(id: number): Promise<string | null> {
    if (this.grupos().some(g => g.materiaId === id)) return 'La materia tiene grupos asociados.';
    if (!environment.usarMock) {
      const error = await this.llamar('DELETE', `/materia/eliminar/${id}`);
      if (error) return error;
    }
    this.materias.update(l => l.filter(m => m.id !== id));
    return null;
  }

  async crearGrupo(materiaId: number | null, numeroGrupo: number | null, cupoPlaneado: number | null): Promise<string | null> {
    if (materiaId === null) return 'Selecciona la materia.';
    if (numeroGrupo === null || numeroGrupo < 1) return 'Ingresa el número de grupo.';
    if (cupoPlaneado === null || cupoPlaneado < 1) return 'Ingresa el cupo planeado.';
    if (cupoPlaneado > CUPO_MAXIMO) return `El cupo máximo permitido es ${CUPO_MAXIMO}.`;
    if (this.grupos().some(g => g.materiaId === materiaId && g.numeroGrupo === numeroGrupo)) {
      return 'La materia ya tiene ese número de grupo.';
    }
    if (!environment.usarMock) {
      const error = await this.llamar('POST', '/grupo/crear', { materiaId, numeroGrupo, cupoPlaneado }, MSG_GRUPOS);
      if (error) return error;
      this.cargarGrupos();
      return null;
    }
    this.grupos.update(l => [...l, { id: this.siguienteId(l), materiaId, numeroGrupo, cupoPlaneado }]);
    return null;
  }

  async eliminarGrupo(id: number): Promise<string | null> {
    if (!environment.usarMock) {
      const error = await this.llamar('DELETE', `/grupo/eliminar/${id}`, {}, MSG_GRUPOS);
      if (error) return error;
    }
    this.grupos.update(l => l.filter(g => g.id !== id));
    this.sesiones.update(l => l.filter(s => s.grupoId !== id));
    return null;
  }

  async asignarSesion(d: NuevaSesion): Promise<string | null> {
    if (d.grupoId === null) return 'Selecciona el grupo.';
    const grupo = this.grupos().find(g => g.id === d.grupoId);
    if (!grupo) return 'El grupo no existe.';
    if (!this.horasValidas(d.dia).includes(d.horaInicio)) {
      return 'Cada sesión dura 2 horas, entre 07:00 y 22:00 (sábado hasta las 13:00) y sin cruzar 12:00-13:00.';
    }
    const horaFin = d.horaInicio + 2;
    const diaNumero = this.dias.indexOf(d.dia) + 1;
    const propias = this.sesiones().filter(s => s.grupoId === grupo.id);
    const max = this.maxSesiones(grupo);
    if (propias.length >= max) return `El grupo ya tiene sus ${max} sesiones semanales.`;
    const cruce = propias.some(
      s => s.diaSemana === diaNumero && d.horaInicio < this.hora(s.horaFin) && horaFin > this.hora(s.horaInicio)
    );
    if (cruce) return 'El grupo ya tiene una sesión que se cruza en ese horario.';

    const sesion: SesionDTO = {
      id: this.siguienteId(this.sesiones()),
      grupoId: grupo.id,
      diaSemana: diaNumero,
      horaInicio: `${this.formatoHora(d.horaInicio)}:00`,
      horaFin: `${this.formatoHora(horaFin)}:00`
    };
    if (!environment.usarMock && environment.sesionesEnBack) {
      const error = await this.llamar('POST', '/sesion/crear', {
        grupoId: sesion.grupoId,
        diaSemana: sesion.diaSemana,
        horaInicio: String(sesion.horaInicio),
        horaFin: String(sesion.horaFin)
      });
      if (error) return error;
      this.cargarSesiones();
      return null;
    }
    this.sesiones.update(l => [...l, sesion]);
    this.guardarLocal();
    return null;
  }

  async eliminarSesion(id: number): Promise<string | null> {
    if (!environment.usarMock && environment.sesionesEnBack) {
      const error = await this.llamar('DELETE', `/sesion/eliminar/${id}`);
      if (error) return error;
    }
    this.sesiones.update(l => l.filter(s => s.id !== id));
    this.guardarLocal();
    return null;
  }

  private cargarMaterias(): void {
    this.http.get<MateriaDTO[] | null>(`${this.api}/materia/mostrartodo`).subscribe({
      next: lista => this.materias.set(lista ?? []),
      error: e => this.errorApi.set(this.mensajeError(e))
    }).add(() => this.terminar());
  }

  private cargarGrupos(): void {
    this.http.get<GrupoDTO[] | null>(`${this.api}/grupo/mostrartodo`).subscribe({
      next: lista => this.grupos.set(lista ?? []),
      error: e => this.errorApi.set(this.mensajeError(e))
    }).add(() => this.terminar());
  }

  private cargarSesiones(): void {
    this.http.get<SesionDTO[] | null>(`${this.api}/sesion/mostrartodo`).subscribe({
      next: lista => this.sesiones.set(lista ?? []),
      error: e => this.errorApi.set(this.mensajeError(e))
    }).add(() => this.terminar());
  }

  private async llamar(metodo: 'POST' | 'PUT' | 'DELETE', ruta: string, datos: Record<string, string | number | boolean> = {}, mensaje403 = ''): Promise<string | null> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(datos)) params = params.set(clave, String(valor));
    try {
      await firstValueFrom(this.http.request(metodo, `${this.api}${ruta}`, { params, responseType: 'text' }));
      return null;
    } catch (e) {
      if (mensaje403 && (e as HttpErrorResponse).status === 403) return mensaje403;
      return this.mensajeError(e);
    }
  }

  private terminar(): void {
    this.pendientes--;
    if (this.pendientes <= 0) this.cargando.set(false);
  }

  private guardarLocal(): void {
    if (environment.usarMock || environment.sesionesEnBack) return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(this.sesiones()));
    } catch {}
  }

  private leerLocal(): SesionDTO[] {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private maxSesiones(g: GrupoDTO): number {
    const materia = this.materias().find(m => m.id === g.materiaId);
    return materia?.sesionesSemanales ?? Math.floor((materia?.horasDeLaMateria ?? 4) / 2);
  }

  private nombreMateria(id: number): string {
    return this.materias().find(m => m.id === id)?.nombre ?? `Materia ${id}`;
  }

  private siguienteId(lista: { id: number }[]): number {
    return lista.reduce((max, x) => Math.max(max, x.id), 0) + 1;
  }

  private hora(valor: string | number[]): number {
    return Array.isArray(valor) ? valor[0] : parseInt(valor.slice(0, 2), 10);
  }

  private aClase(s: SesionDTO): ClaseHorario | null {
    const grupo = this.grupos().find(g => g.id === s.grupoId);
    if (!grupo) return null;
    return {
      id: s.id,
      grupoId: grupo.id,
      materiaId: grupo.materiaId,
      materia: this.nombreMateria(grupo.materiaId),
      grupo: String(grupo.numeroGrupo),
      dia: this.dias[s.diaSemana - 1] ?? 'Lunes',
      horaInicio: this.hora(s.horaInicio),
      horaFin: this.hora(s.horaFin),
      color: this.colorDe(grupo.materiaId)
    };
  }

  private mensajeError(e: unknown): string {
    const err = e as HttpErrorResponse;
    if (typeof err.error === 'string' && err.error) return err.error;
    if (err.status === 403) return 'Tu rol no tiene permiso para esta acción.';
    if (err.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
    return 'No se pudo conectar con el servidor.';
  }
}
