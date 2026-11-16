import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { mensajeHttp } from './http-error';
import { GrupoDTO } from '../models/grupo.dto';
import { MateriaDTO, NuevaMateria } from '../models/materia.dto';
import { SesionDTO } from '../models/sesion.dto';
import { ClaseHorario, Dia, NuevaSesion } from '../models/horario.model';
import { GRUPOS_MOCK, MATERIAS_MOCK, SESIONES_MOCK } from '../mock/horario.mock';
import { DatosForm, formulario } from './http-form';
import { ParametroService } from './parametro.service';
import { AuthService } from './auth.service';

const LOCAL_KEY = 'sesiones-local';
const PUBLICADAS_KEY = 'sesiones-publicadas';

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private http = inject(HttpClient);
  private params = inject(ParametroService);
  private auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  readonly dias: Dia[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  /** Filas del calendario: la jornada configurada, ampliada si hay sesiones que quedaron fuera de ella. */
  readonly horasGrilla = computed(() => {
    const r = this.params.reglas();
    let desde = Math.floor(r.inicioJornada / 60);
    let hasta = Math.ceil(Math.max(r.finSemana, r.finSabado) / 60);
    for (const c of this.clases()) {
      desde = Math.min(desde, c.horaInicio);
      hasta = Math.max(hasta, c.horaFin);
    }
    return Array.from({ length: Math.max(1, hasta - desde) }, (_, i) => desde + i);
  });
  readonly cupoMaximo = this.params.cupoMaximo;
  readonly avisoSesiones = !environment.usarMock && !environment.sesionesEnBack;

  readonly materias = signal<MateriaDTO[]>(environment.usarMock ? MATERIAS_MOCK : []);
  readonly grupos = signal<GrupoDTO[]>(environment.usarMock ? GRUPOS_MOCK : []);
  readonly errorApi = signal('');
  readonly cargando = signal(false);

  private pendientes = 0;
  private readonly sesiones = signal<SesionDTO[]>(environment.usarMock ? SESIONES_MOCK : this.leerLocal());
  /** Ids publicados cuando el back no marca cada sesión (modo mock o sesiones guardadas en el navegador). */
  private readonly publicadasLocal = signal<number[]>(this.leerPublicadas());
  /** Estado global del horario según el back (/horario/estado). */
  readonly publicadoBack = signal(false);

  /** El gestor ve todo (borradores incluidos); el consultante solo lo publicado. */
  private readonly sesionesVisibles = computed(() =>
    this.auth.esGestor() ? this.sesiones() : this.sesiones().filter(s => this.estaPublicada(s))
  );
  /** Sesiones en armado que todavía no se han publicado. */
  readonly sinPublicar = computed(() => this.sesiones().filter(s => !this.estaPublicada(s)).length);
  private readonly colores = ['#f97316', '#2563eb', '#059669', '#7c3aed', '#db2777', '#0891b2', '#ca8a04'];

  readonly clases = computed(() =>
    this.sesionesVisibles().flatMap(s => {
      const clase = this.aClase(s);
      return clase ? [clase] : [];
    })
  );
  /** Sesiones que no cumplen la jornada y la pausa vigentes (p. ej. después de cambiar un parámetro). */
  readonly clasesFueraDeHorario = computed(() => this.clases().filter(c => !this.dentroDeHorario(c)));
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
      sesiones: this.sesionesVisibles().filter(s => s.grupoId === g.id).length,
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
    if (environment.sesionesEnBack) {
      this.cargarSesiones();
      this.cargarEstado();
    }
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

  /** Pausa del mediodía (almuerzo), en minutos desde la medianoche. */
  readonly pausa = computed(() => {
    const r = this.params.reglas();
    return { inicio: r.pausaInicio, fin: r.pausaFin };
  });
  readonly textoPausa = computed(() => `${this.hhmm(this.pausa().inicio)} - ${this.hhmm(this.pausa().fin)}`);

  /** true si la fila de esa hora de la grilla toca la pausa del mediodía. */
  esPausa(hora: number): boolean {
    const p = this.pausa();
    return hora * 60 < p.fin && p.inicio < (hora + 1) * 60;
  }

  /** true si una sesión de 2 h que inicia a esa hora cruza la pausa del mediodía. */
  cruzaPausa(horaInicio: number): boolean {
    const p = this.pausa();
    return horaInicio * 60 < p.fin && p.inicio < (horaInicio + 2) * 60;
  }

  /** La sesión cabe en la jornada del día y no cruza la pausa del mediodía. */
  dentroDeHorario(c: ClaseHorario): boolean {
    const r = this.params.reglas();
    const cierre = c.dia === 'Sábado' ? r.finSabado : r.finSemana;
    const inicio = c.horaInicio * 60;
    const fin = c.horaFin * 60;
    return inicio >= r.inicioJornada && fin <= cierre && !(inicio < r.pausaFin && r.pausaInicio < fin);
  }

  motivoFueraDeHorario(c: ClaseHorario): string {
    const r = this.params.reglas();
    const cierre = c.dia === 'Sábado' ? r.finSabado : r.finSemana;
    if (c.horaInicio * 60 < r.inicioJornada) return `empieza antes de la apertura (${this.hhmm(r.inicioJornada)})`;
    if (c.horaFin * 60 > cierre) return `termina después del cierre (${this.hhmm(cierre)})`;
    return `cruza la pausa del mediodía (${this.hhmm(r.pausaInicio)}-${this.hhmm(r.pausaFin)})`;
  }

  /** Horas de inicio posibles: sesión de 2 h dentro de la jornada y fuera de la pausa. */
  horasValidas(dia: Dia): number[] {
    const r = this.params.reglas();
    const cierre = dia === 'Sábado' ? r.finSabado : r.finSemana;
    return this.horasGrilla().filter(h => {
      const inicio = h * 60;
      const fin = inicio + 120;
      return inicio >= r.inicioJornada && fin <= cierre && !(inicio < r.pausaFin && r.pausaInicio < fin);
    });
  }

  async crearMateria(m: NuevaMateria): Promise<string | null> {
    if (!Number.isInteger(m.codigo) || m.codigo < 1) return 'Ingresa el código de la materia.';
    if (!m.nombre.trim()) return 'Ingresa el nombre de la materia.';
    if (m.semestre < 1 || m.semestre > 9) return 'El semestre debe estar entre 1 y 9.';
    if (m.ncreditos < 1 || m.horasDeLaMateria < 2) return 'Revisa créditos y horas.';
    if (m.horasDeLaMateria % 2 !== 0) return 'Las horas deben ser pares: cada sesión dura 2 horas.';
    const maxSesiones = this.params.reglas().sesionesMaximas;
    if (m.horasDeLaMateria / 2 > maxSesiones) return `La materia tendría ${m.horasDeLaMateria / 2} sesiones semanales y el máximo es ${maxSesiones}.`;
    if (this.materias().some(x => x.codigo === m.codigo)) return 'Ya existe una materia con ese código.';
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
    if (!Number.isInteger(m.codigo) || m.codigo < 1) return 'Ingresa el código de la materia.';
    if (!m.nombre.trim()) return 'Ingresa el nombre de la materia.';
    if (m.semestre < 1 || m.semestre > 9) return 'El semestre debe estar entre 1 y 9.';
    if (m.ncreditos < 1 || m.horasDeLaMateria < 2) return 'Revisa créditos y horas.';
    if (m.horasDeLaMateria % 2 !== 0) return 'Las horas deben ser pares: cada sesión dura 2 horas.';
    const maxSesiones = this.params.reglas().sesionesMaximas;
    if (m.horasDeLaMateria / 2 > maxSesiones) return `La materia tendría ${m.horasDeLaMateria / 2} sesiones semanales y el máximo es ${maxSesiones}.`;
    if (this.materias().some(x => x.id !== m.id && x.codigo === m.codigo)) return 'Ya existe una materia con ese código.';

    const original = this.materias().find(x => x.id === m.id);
    const sesionesDe = (g: GrupoDTO) => this.sesiones().filter(s => s.grupoId === g.id).length;
    const grupos = this.grupos().filter(g => g.materiaId === m.id);
    if (original && original.semestre !== m.semestre && grupos.some(g => sesionesDe(g) > 0)) {
      return 'No se puede cambiar el semestre: el curso ya tiene sesiones asignadas.';
    }
    const nuevasSesiones = m.horasDeLaMateria / 2;
    const excedido = grupos.find(g => sesionesDe(g) > nuevasSesiones);
    if (excedido) {
      return `El grupo ${excedido.numeroGrupo} ya tiene ${sesionesDe(excedido)} sesiones asignadas y el curso solo tendría ${nuevasSesiones}. Quita sesiones antes de reducir las horas.`;
    }

    if (!environment.usarMock) {
      const error = await this.llamar('PUT', '/materia/actualizar', {
        id: m.id,
        codigo: m.codigo,
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
    if (environment.usarMock && cupoPlaneado > this.cupoMaximo()) return `El cupo máximo permitido es ${this.cupoMaximo()}.`;
    if (this.grupos().some(g => g.materiaId === materiaId && g.numeroGrupo === numeroGrupo)) {
      return 'La materia ya tiene ese número de grupo.';
    }
    if (!environment.usarMock) {
      const error = await this.llamar('POST', '/grupo/crear', { materiaId, numeroGrupo, cupoPlaneado });
      if (error) return error;
      this.cargarGrupos();
      return null;
    }
    this.grupos.update(l => [...l, { id: this.siguienteId(l), materiaId, numeroGrupo, cupoPlaneado }]);
    return null;
  }

  async actualizarGrupo(id: number, numeroGrupo: number | null, cupoPlaneado: number | null): Promise<string | null> {
    const grupo = this.grupos().find(g => g.id === id);
    if (!grupo) return 'El grupo no existe.';
    if (numeroGrupo === null || numeroGrupo < 1) return 'Ingresa el número de grupo.';
    if (cupoPlaneado === null || cupoPlaneado < 1) return 'Ingresa el cupo planeado.';
    if (environment.usarMock && cupoPlaneado > this.cupoMaximo()) return `El cupo máximo permitido es ${this.cupoMaximo()}.`;
    if (this.grupos().some(g => g.id !== id && g.materiaId === grupo.materiaId && g.numeroGrupo === numeroGrupo)) {
      return 'La materia ya tiene ese número de grupo.';
    }
    if (!environment.usarMock) {
      const error = await this.llamar('PUT', '/grupo/actualizar', { id, numeroGrupo, cupoPlaneado });
      if (error) return error;
      this.cargarGrupos();
      return null;
    }
    this.grupos.update(l => l.map(g => (g.id === id ? { ...g, numeroGrupo, cupoPlaneado } : g)));
    return null;
  }

  async eliminarGrupo(id: number): Promise<string | null> {
    if (!environment.usarMock) {
      const error = await this.llamar('DELETE', `/grupo/eliminar/${id}`);
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
    const horaFin = d.horaInicio + 2;
    const diaNumero = this.dias.indexOf(d.dia) + 1;

    // Con el back disponible, él valida franja, pausa, máximo de sesiones y cruces
    // (los parámetros son configurables) y responde con el mensaje de la regla.
    if (!environment.usarMock && environment.sesionesEnBack) {
      const error = await this.llamar('POST', '/sesion/crear', {
        grupoId: grupo.id,
        diaSemana: diaNumero,
        horaInicio: this.formatoHora(d.horaInicio),
        horaFin: this.formatoHora(horaFin)
      });
      if (error) return error;
      this.cargarSesiones();
      return null;
    }

    const invalido = this.validarLocal(grupo, d.dia, d.horaInicio, null);
    if (invalido) return invalido;

    this.sesiones.update(l => [
      ...l,
      {
        id: this.siguienteId(l),
        grupoId: grupo.id,
        diaSemana: diaNumero,
        horaInicio: `${this.formatoHora(d.horaInicio)}:00`,
        horaFin: `${this.formatoHora(horaFin)}:00`,
        publicada: false
      }
    ]);
    this.guardarLocal();
    return null;
  }

  async moverSesion(id: number, dia: Dia, horaInicio: number): Promise<string | null> {
    const sesion = this.sesiones().find(s => s.id === id);
    if (!sesion) return 'La sesión no existe.';
    const grupo = this.grupos().find(g => g.id === sesion.grupoId);
    if (!grupo) return 'El grupo no existe.';
    const horaFin = horaInicio + 2;
    const diaNumero = this.dias.indexOf(dia) + 1;

    if (!environment.usarMock && environment.sesionesEnBack) {
      const error = await this.llamar('PUT', '/sesion/actualizar', {
        id,
        diaSemana: diaNumero,
        horaInicio: this.formatoHora(horaInicio),
        horaFin: this.formatoHora(horaFin)
      });
      if (error) return error;
      this.desmarcarPublicada(id);
      this.cargarSesiones();
      return null;
    }

    const invalido = this.validarLocal(grupo, dia, horaInicio, id);
    if (invalido) return invalido;
    this.sesiones.update(l =>
      l.map(s =>
        s.id === id
          ? { ...s, diaSemana: diaNumero, horaInicio: `${this.formatoHora(horaInicio)}:00`, horaFin: `${this.formatoHora(horaFin)}:00`, publicada: false }
          : s
      )
    );
    this.desmarcarPublicada(id);
    this.guardarLocal();
    return null;
  }

  async eliminarSesion(id: number): Promise<string | null> {
    if (!environment.usarMock && environment.sesionesEnBack) {
      const error = await this.llamar('DELETE', `/sesion/eliminar/${id}`);
      if (error) return error;
    }
    this.sesiones.update(l => l.filter(s => s.id !== id));
    this.desmarcarPublicada(id);
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

  private async llamar(metodo: 'POST' | 'PUT' | 'DELETE', ruta: string, datos: DatosForm = {}): Promise<string | null> {
    const body = metodo === 'DELETE' ? null : formulario(datos);
    try {
      await firstValueFrom(this.http.request(metodo, `${this.api}${ruta}`, { body, responseType: 'text' }));
      return null;
    } catch (e) {
      return this.mensajeError(e);
    }
  }

  private terminar(): void {
    this.pendientes--;
    if (this.pendientes <= 0) this.cargando.set(false);
  }

  /** Consulta el estado global de publicación al back (lo necesita también el consultante). */
  cargarEstado(): void {
    if (environment.usarMock) return;
    this.http.get<boolean>(`${this.api}/horario/estado`).subscribe({
      next: valor => this.publicadoBack.set(valor === true),
      error: e => this.errorApi.set(this.mensajeError(e))
    });
  }

  /** Publica el horario: desde ese momento el consultante ve todas las sesiones actuales. */
  marcarTodasPublicadas(): void {
    this.sesiones.update(l => l.map(s => ({ ...s, publicada: true })));
    this.guardarPublicadas(this.sesiones().map(s => s.id));
    this.guardarLocal();
  }

  /**
   * Una sesión es pública si el back la marca como publicada; si no la marca, depende del estado
   * global del horario en el back, o de la lista local cuando las sesiones viven en el navegador.
   */
  private estaPublicada(s: SesionDTO): boolean {
    if (typeof s.publicada === 'boolean') return s.publicada;
    if (!environment.usarMock && environment.sesionesEnBack) return this.publicadoBack();
    return this.publicadasLocal().includes(s.id);
  }

  private desmarcarPublicada(id: number): void {
    if (this.publicadasLocal().includes(id)) this.guardarPublicadas(this.publicadasLocal().filter(x => x !== id));
  }

  private guardarPublicadas(ids: number[]): void {
    this.publicadasLocal.set(ids);
    try {
      localStorage.setItem(PUBLICADAS_KEY, JSON.stringify(ids));
    } catch {}
  }

  private leerPublicadas(): number[] {
    try {
      const ids = JSON.parse(localStorage.getItem(PUBLICADAS_KEY) ?? '[]');
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
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

  /** Reglas de horario aplicadas en el cliente (modo mock o sin endpoint de sesiones). */
  private validarLocal(grupo: GrupoDTO, dia: Dia, horaInicio: number, ignorarId: number | null): string | null {
    if (!this.horasValidas(dia).includes(horaInicio)) return this.mensajeFranja();
    const horaFin = horaInicio + 2;
    const diaNumero = this.dias.indexOf(dia) + 1;
    const propias = this.sesiones().filter(s => s.grupoId === grupo.id && s.id !== ignorarId);
    const max = this.maxSesiones(grupo);
    if (propias.length >= max) return `El grupo ya tiene sus ${max} sesiones semanales.`;
    const cruce = propias.some(
      s => s.diaSemana === diaNumero && horaInicio < this.hora(s.horaFin) && horaFin > this.hora(s.horaInicio)
    );
    return cruce ? 'El grupo ya tiene una sesión que se cruza en ese horario.' : null;
  }

  private mensajeFranja(): string {
    const r = this.params.reglas();
    return (
      `Cada sesión dura 2 horas, entre ${this.hhmm(r.inicioJornada)} y ${this.hhmm(r.finSemana)} ` +
      `(sábado hasta las ${this.hhmm(r.finSabado)}) y sin cruzar ${this.hhmm(r.pausaInicio)}-${this.hhmm(r.pausaFin)}.`
    );
  }

  private hhmm(minutos: number): string {
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
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
      color: this.colorDe(grupo.materiaId),
      publicada: this.estaPublicada(s)
    };
  }

  private mensajeError(e: unknown): string {
    return mensajeHttp(e);
  }
}
