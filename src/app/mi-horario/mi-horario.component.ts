import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { ClaseHorario, Dia } from '../models/horario.model';
import { normalizar } from '../utils/texto';

interface Bloque {
  clase: ClaseHorario;
  /** Posición (0, 1, 2...) dentro de las sesiones que coinciden en el mismo horario. */
  carril: number;
  /** Cuántas sesiones comparten ese horario: el bloque ocupa 1/carriles del ancho del día. */
  carriles: number;
}

@Component({
  selector: 'app-mi-horario',
  templateUrl: './mi-horario.component.html',
  styleUrl: './mi-horario.component.css',
  standalone: false
})
export class MiHorarioComponent {
  private svc = inject(HorarioService);
  private router = inject(Router);
  auth = inject(AuthService);

  grupos = this.svc.gruposEtiquetados;

  // Filtros
  fMateria = signal('');
  fGrupo = signal<number | null>(null);
  fId = signal<number | null>(null);
  fDia = signal<Dia | ''>('');
  fEstado = signal<'' | 'publicada' | 'borrador'>('');
  sinPublicar = this.svc.sinPublicar;

  hayFiltros = computed(
    () => !!this.fMateria() || this.fGrupo() !== null || this.fId() !== null || !!this.fDia() || !!this.fEstado()
  );

  clases = computed(() => {
    const materia = normalizar(this.fMateria());
    const grupo = this.fGrupo();
    const id = this.fId();
    const dia = this.fDia();
    const estado = this.fEstado();
    return this.svc
      .clases()
      .filter(
        c =>
          (!materia || normalizar(c.materia).includes(materia)) &&
          (grupo === null || c.grupoId === grupo) &&
          (id === null || c.id === id) &&
          (!dia || c.dia === dia) &&
          (!estado || c.publicada === (estado === 'publicada'))
      );
  });
  total = computed(() => this.svc.clases().length);
  fueraDeHorario = this.svc.clasesFueraDeHorario;
  bloques = computed(() => this.distribuir(this.clases()));
  dias = this.svc.dias;
  horas = this.svc.horasGrilla;
  aviso = this.svc.avisoSesiones;
  textoPausa = this.svc.textoPausa;
  /** Filas de la grilla que ocupa la pausa del mediodía (null si queda fuera de la grilla). */
  pausaFilas = computed(() => {
    const p = this.svc.pausa();
    const h = this.horas();
    const desde = Math.max(Math.floor(p.inicio / 60), h[0]);
    const hasta = Math.min(Math.ceil(p.fin / 60), h[h.length - 1] + 1);
    return hasta > desde ? `${this.fila(desde)} / ${this.fila(hasta)}` : null;
  });
  seleccionada = signal<ClaseHorario | null>(null);

  moviendo = signal(false);
  errorMover = signal('');
  nuevoDia: Dia = 'Lunes';
  nuevaHora = 8;

  fmt(h: number): string {
    return this.svc.formatoHora(h);
  }

  dentro(c: ClaseHorario): boolean {
    return this.svc.dentroDeHorario(c);
  }

  titulo(c: ClaseHorario): string {
    return `${c.materia} · Grupo ${c.grupo} · ${c.dia} ${this.fmt(c.horaInicio)} - ${this.fmt(c.horaFin)}`;
  }

  /** Reparte en columnas las sesiones que se solapan el mismo día, para que ninguna tape a otra. */
  private distribuir(clases: ClaseHorario[]): Bloque[] {
    const resultado: Bloque[] = [];
    for (const dia of this.dias) {
      const delDia = clases
        .filter(c => c.dia === dia)
        .sort((a, b) => a.horaInicio - b.horaInicio || a.horaFin - b.horaFin || a.id - b.id);
      let grupo: { clase: ClaseHorario; carril: number }[] = [];
      let finCarriles: number[] = [];
      let finGrupo = -1;
      const cerrar = () => {
        for (const x of grupo) resultado.push({ clase: x.clase, carril: x.carril, carriles: finCarriles.length });
        grupo = [];
        finCarriles = [];
        finGrupo = -1;
      };
      for (const c of delDia) {
        if (grupo.length && c.horaInicio >= finGrupo) cerrar();
        let carril = finCarriles.findIndex(fin => fin <= c.horaInicio);
        if (carril === -1) {
          carril = finCarriles.length;
          finCarriles.push(c.horaFin);
        } else {
          finCarriles[carril] = c.horaFin;
        }
        grupo.push({ clase: c, carril });
        finGrupo = Math.max(finGrupo, c.horaFin);
      }
      cerrar();
    }
    return resultado;
  }

  col(dia: Dia): number {
    return this.dias.indexOf(dia) + 2;
  }

  fila(hora: number): number {
    return hora - this.horas()[0] + 2;
  }

  esPausa(hora: number): boolean {
    return this.svc.esPausa(hora);
  }

  limpiarFiltros(): void {
    this.fMateria.set('');
    this.fGrupo.set(null);
    this.fId.set(null);
    this.fDia.set('');
    this.fEstado.set('');
  }

  asignarEn(dia: Dia, hora: number): void {
    if (!this.auth.esGestor() || this.esPausa(hora)) return;
    this.router.navigate(['/horario/asignar'], { queryParams: { dia, hora } });
  }

  horasDisponibles(): number[] {
    return this.svc.horasValidas(this.nuevoDia);
  }

  cerrar(): void {
    this.seleccionada.set(null);
    this.moviendo.set(false);
    this.errorMover.set('');
  }

  iniciarMovimiento(clase: ClaseHorario): void {
    this.nuevoDia = clase.dia;
    this.nuevaHora = clase.horaInicio;
    this.errorMover.set('');
    this.moviendo.set(true);
  }

  cambiarDia(dia: Dia): void {
    this.nuevoDia = dia;
    const validas = this.horasDisponibles();
    if (validas.length && !validas.includes(this.nuevaHora)) this.nuevaHora = validas[0];
  }

  async guardarMovimiento(clase: ClaseHorario): Promise<void> {
    const resultado = await this.svc.moverSesion(clase.id, this.nuevoDia, this.nuevaHora);
    if (resultado) {
      this.errorMover.set(resultado);
      return;
    }
    this.cerrar();
  }

  async eliminar(clase: ClaseHorario): Promise<void> {
    await this.svc.eliminarSesion(clase.id);
    this.cerrar();
  }
}
