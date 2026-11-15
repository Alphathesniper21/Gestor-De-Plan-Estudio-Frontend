import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { mensajeHttp } from './http-error';
import { ParametroDTO } from '../models/parametro.dto';
import { formulario } from './http-form';

export const CLAVES = {
  horaInicioJornada: 'hora.inicio.jornada',
  horaFinSemana: 'hora.fin.semana',
  horaFinSabado: 'hora.fin.sabado',
  pausaInicio: 'pausa.inicio',
  pausaFin: 'pausa.fin',
  cupoBase: 'cupo.base',
  cupoTolerancia: 'cupo.tolerancia',
  sesionesMaximas: 'sesiones.maximas'
} as const;

/** Mismos valores iniciales que el back (ParametroService.VALORES_POR_DEFECTO). */
const POR_DEFECTO: ParametroDTO[] = [
  { clave: CLAVES.cupoBase, valor: '40' },
  { clave: CLAVES.cupoTolerancia, valor: '0.10' },
  { clave: CLAVES.horaFinSabado, valor: '13:00' },
  { clave: CLAVES.horaFinSemana, valor: '22:00' },
  { clave: CLAVES.horaInicioJornada, valor: '07:00' },
  { clave: CLAVES.pausaFin, valor: '13:00' },
  { clave: CLAVES.pausaInicio, valor: '12:00' },
  { clave: CLAVES.sesionesMaximas, valor: '4' }
];

/** Las horas van en minutos desde la medianoche (07:00 = 420). */
export interface Reglas {
  inicioJornada: number;
  finSemana: number;
  finSabado: number;
  pausaInicio: number;
  pausaFin: number;
  cupoBase: number;
  tolerancia: number;
  sesionesMaximas: number;
}

@Injectable({ providedIn: 'root' })
export class ParametroService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly parametros = signal<ParametroDTO[]>(POR_DEFECTO.map(p => ({ ...p })));
  readonly cargando = signal(false);
  readonly errorApi = signal('');

  readonly reglas = computed<Reglas>(() => {
    const mapa = new Map(this.parametros().map(p => [p.clave, p.valor]));
    const texto = (clave: string) => mapa.get(clave) ?? POR_DEFECTO.find(p => p.clave === clave)!.valor;
    return {
      inicioJornada: this.minutos(texto(CLAVES.horaInicioJornada)),
      finSemana: this.minutos(texto(CLAVES.horaFinSemana)),
      finSabado: this.minutos(texto(CLAVES.horaFinSabado)),
      pausaInicio: this.minutos(texto(CLAVES.pausaInicio)),
      pausaFin: this.minutos(texto(CLAVES.pausaFin)),
      cupoBase: Number(texto(CLAVES.cupoBase)),
      tolerancia: Number(texto(CLAVES.cupoTolerancia)),
      sesionesMaximas: Number(texto(CLAVES.sesionesMaximas))
    };
  });

  /** Cupo base por (1 + tolerancia), redondeado hacia abajo: 40 y 0.10 dan 44. */
  readonly cupoMaximo = computed(() => {
    const r = this.reglas();
    return Math.floor(r.cupoBase * (1 + r.tolerancia) + 1e-9);
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (environment.usarMock) return;
    this.errorApi.set('');
    this.cargando.set(true);
    this.http
      .get<ParametroDTO[] | null>(`${this.api}/parametro/mostrartodo`)
      .subscribe({
        next: lista => {
          if (lista?.length) this.parametros.set(lista);
        },
        error: e => this.errorApi.set(this.mensajeError(e))
      })
      .add(() => this.cargando.set(false));
  }

  async actualizar(clave: string, valor: string): Promise<string | null> {
    const limpio = valor.trim();
    if (!limpio) return 'El valor no puede estar vacío.';
    if (!environment.usarMock) {
      try {
        await firstValueFrom(
          this.http.put(`${this.api}/parametro/actualizar`, formulario({ clave, valor: limpio }), { responseType: 'text' })
        );
      } catch (e) {
        return this.mensajeError(e);
      }
      this.cargar();
      return null;
    }
    const error = this.validarLocal(clave, limpio);
    if (error) return error;
    this.parametros.update(l => l.map(p => (p.clave === clave ? { ...p, valor: limpio } : p)));
    return null;
  }

  /** Solo se usa en modo mock; con el back, él valida formato y rango. */
  private validarLocal(clave: string, valor: string): string | null {
    const esHora = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
    switch (clave) {
      case CLAVES.horaInicioJornada:
      case CLAVES.horaFinSemana:
      case CLAVES.horaFinSabado:
      case CLAVES.pausaInicio:
      case CLAVES.pausaFin: {
        if (!esHora(valor)) return 'El valor debe tener formato HH:mm (por ejemplo 07:00).';
        const mapa = new Map(this.parametros().map(p => [p.clave, p.valor]));
        mapa.set(clave, valor);
        const m = (c: string) => this.minutos(mapa.get(c) ?? '');
        const inicio = m(CLAVES.horaInicioJornada);
        const finSemana = m(CLAVES.horaFinSemana);
        if (inicio >= finSemana || inicio >= m(CLAVES.horaFinSabado)) {
          return 'Valor fuera de rango: el inicio de la jornada debe ser anterior a los cierres.';
        }
        if (m(CLAVES.pausaInicio) >= m(CLAVES.pausaFin)) {
          return 'Valor fuera de rango: el inicio de la pausa debe ser anterior a su fin.';
        }
        if (m(CLAVES.pausaInicio) < inicio || m(CLAVES.pausaFin) > finSemana) {
          return 'Valor fuera de rango: la pausa debe estar dentro de la franja de lunes a viernes.';
        }
        return null;
      }
      case CLAVES.cupoBase: {
        const n = Number(valor);
        if (!Number.isInteger(n)) return 'El cupo base debe ser un número entero.';
        return n < 1 || n > 200 ? 'Valor fuera de rango: el cupo base debe estar entre 1 y 200.' : null;
      }
      case CLAVES.cupoTolerancia: {
        const n = Number(valor);
        if (Number.isNaN(n)) return 'La tolerancia debe ser un número (por ejemplo 0.10).';
        return n < 0 || n > 1 ? 'Valor fuera de rango: la tolerancia debe estar entre 0 y 1.' : null;
      }
      case CLAVES.sesionesMaximas: {
        const n = Number(valor);
        if (!Number.isInteger(n)) return 'El máximo de sesiones debe ser un número entero.';
        return n < 1 || n > 10 ? 'Valor fuera de rango: el máximo de sesiones debe estar entre 1 y 10.' : null;
      }
      default:
        return null;
    }
  }

  private minutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private mensajeError(e: unknown): string {
    return mensajeHttp(e);
  }
}
