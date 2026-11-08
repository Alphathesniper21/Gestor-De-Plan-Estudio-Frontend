import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { MateriaDTO } from '../models/materia.dto';

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
  filtro = signal('');

  visibles = computed(() => {
    const f = this.normalizar(this.filtro());
    return this.materias().filter(m => this.normalizar(m.nombre).includes(f));
  });

  editandoId: number | null = null;
  nombre = '';
  semestre: number | null = 1;
  ncreditos: number | null = 3;
  horasDeLaMateria: number | null = 4;
  correlativa = false;

  error = signal('');
  exito = signal(false);

  buscar(evento: Event): void {
    this.filtro.set((evento.target as HTMLInputElement).value);
  }

  recargar(): void {
    this.svc.cargar();
  }

  editar(m: MateriaDTO): void {
    this.editandoId = m.id;
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
    this.nombre = '';
    this.semestre = 1;
    this.ncreditos = 3;
    this.horasDeLaMateria = 4;
    this.correlativa = false;
  }

  async guardar(): Promise<void> {
    const datos = {
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

  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
