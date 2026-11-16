import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { GrupoDTO } from '../models/grupo.dto';
import { normalizar } from '../utils/texto';

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
  fMateria = signal('');
  fGrupo = signal<number | null>(null);
  fId = signal<number | null>(null);
  fSesiones = signal<'' | 'completas' | 'pendientes'>('');

  hayFiltros = computed(() => !!this.fMateria() || this.fGrupo() !== null || this.fId() !== null || !!this.fSesiones());

  visibles = computed(() => {
    const materia = normalizar(this.fMateria());
    const grupo = this.fGrupo();
    const id = this.fId();
    const sesiones = this.fSesiones();
    return this.filas().filter(
      x =>
        (!materia || normalizar(x.materia).includes(materia)) &&
        (grupo === null || x.grupo.numeroGrupo === grupo) &&
        (id === null || x.grupo.id === id) &&
        (!sesiones || x.sesiones >= x.maxSesiones === (sesiones === 'completas'))
    );
  });

  editandoId: number | null = null;
  materiaId: number | null = null;
  numeroGrupo: number | null = 1;
  cupoPlaneado: number | null = 30;

  error = signal('');
  exito = signal('');

  limpiarFiltros(): void {
    this.fMateria.set('');
    this.fGrupo.set(null);
    this.fId.set(null);
    this.fSesiones.set('');
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
}
