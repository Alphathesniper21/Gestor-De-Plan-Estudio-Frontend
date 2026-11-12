import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { GrupoDTO } from '../models/grupo.dto';

@Component({
  selector: 'app-grupos',
  templateUrl: './grupos.component.html',
  standalone: false
})
export class GruposComponent {
  private svc = inject(HorarioService);
  auth = inject(AuthService);

  materias = this.svc.materias;
  filas = this.svc.filasGrupos;
  cupoMaximo = this.svc.cupoMaximo;
  cargando = this.svc.cargando;
  filtro = signal('');

  visibles = computed(() => {
    const f = this.normalizar(this.filtro());
    return this.filas().filter(x => this.normalizar(x.materia).includes(f));
  });

  editandoId: number | null = null;
  materiaId: number | null = null;
  numeroGrupo: number | null = 1;
  cupoPlaneado: number | null = 30;

  error = signal('');
  exito = signal('');

  buscar(evento: Event): void {
    this.filtro.set((evento.target as HTMLInputElement).value);
  }

  recargar(): void {
    this.svc.cargar();
  }

  editar(g: GrupoDTO): void {
    this.editandoId = g.id;
    this.materiaId = g.materiaId;
    this.numeroGrupo = g.numeroGrupo;
    this.cupoPlaneado = g.cupoPlaneado;
    this.error.set('');
    this.exito.set('');
  }

  cancelar(): void {
    this.editandoId = null;
    this.materiaId = null;
    this.numeroGrupo = 1;
    this.cupoPlaneado = 30;
  }

  async guardar(): Promise<void> {
    const editando = this.editandoId !== null;
    const resultado =
      this.editandoId === null
        ? await this.svc.crearGrupo(this.materiaId, this.numeroGrupo, this.cupoPlaneado)
        : await this.svc.actualizarGrupo(this.editandoId, this.numeroGrupo, this.cupoPlaneado);
    this.error.set(resultado ?? '');
    this.exito.set(resultado ? '' : editando ? 'Grupo actualizado correctamente.' : 'Grupo creado correctamente.');
    if (!resultado && editando) this.cancelar();
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.svc.eliminarGrupo(id);
    this.error.set(resultado ?? '');
    this.exito.set('');
  }

  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
