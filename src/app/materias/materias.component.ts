import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { MateriaDTO } from '../models/materia.dto';
import { normalizar } from '../utils/texto';

@Component({
  selector: 'app-materias',
  templateUrl: './materias.component.html',
  standalone: false
})
export class MateriasComponent {
  private svc = inject(HorarioService);
  auth = inject(AuthService);

  materias = this.svc.materias;
  cargando = this.svc.cargando;
  fNombre = signal('');
  fSemestre = signal<number | null>(null);
  fCorrelativa = signal<'' | 'si' | 'no'>('');

  semestres = computed(() => [...new Set(this.materias().map(m => m.semestre))].sort((a, b) => a - b));
  hayFiltros = computed(() => !!this.fNombre() || this.fSemestre() !== null || !!this.fCorrelativa());

  visibles = computed(() => {
    const texto = normalizar(this.fNombre());
    const semestre = this.fSemestre();
    const correlativa = this.fCorrelativa();
    return this.materias().filter(
      m =>
        (!texto || normalizar(m.nombre).includes(texto) || String(m.codigo).includes(texto)) &&
        (semestre === null || m.semestre === semestre) &&
        (!correlativa || m.correlativa === (correlativa === 'si'))
    );
  });

  editandoId: number | null = null;
  codigo: number | null = null;
  nombre = '';
  semestre: number | null = 1;
  ncreditos: number | null = 3;
  horasDeLaMateria: number | null = 4;
  correlativa = false;

  error = signal('');
  exito = signal(false);

  limpiarFiltros(): void {
    this.fNombre.set('');
    this.fSemestre.set(null);
    this.fCorrelativa.set('');
  }

  recargar(): void {
    this.svc.cargar();
  }

  editar(m: MateriaDTO): void {
    this.editandoId = m.id;
    this.codigo = m.codigo;
    this.nombre = m.nombre;
    this.semestre = m.semestre;
    this.ncreditos = m.ncreditos;
    this.horasDeLaMateria = m.horasDeLaMateria;
    this.correlativa = m.correlativa;
    this.error.set('');
    this.exito.set(false);
  }

  cancelar(): void {
    this.editandoId = null;
    this.codigo = null;
    this.nombre = '';
    this.semestre = 1;
    this.ncreditos = 3;
    this.horasDeLaMateria = 4;
    this.correlativa = false;
  }

  async guardar(): Promise<void> {
    const datos = {
      codigo: this.codigo ?? 0,
      nombre: this.nombre,
      semestre: this.semestre ?? 0,
      ncreditos: this.ncreditos ?? 0,
      horasDeLaMateria: this.horasDeLaMateria ?? 0,
      correlativa: this.correlativa
    };
    const resultado =
      this.editandoId === null
        ? await this.svc.crearMateria(datos)
        : await this.svc.actualizarMateria({ id: this.editandoId, ...datos });
    this.error.set(resultado ?? '');
    this.exito.set(!resultado);
    if (!resultado) this.cancelar();
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.svc.eliminarMateria(id);
    this.error.set(resultado ?? '');
    this.exito.set(false);
  }
}
