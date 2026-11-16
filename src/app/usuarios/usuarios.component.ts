import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { RolUsuario, UsuarioDTO } from '../models/usuario.dto';
import { normalizar } from '../utils/texto';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  standalone: false
})
export class UsuariosComponent {
  private svc = inject(UsuarioService);
  auth = inject(AuthService);

  usuarios = this.svc.usuarios;
  cargando = this.svc.cargando;
  errorApi = this.svc.errorApi;

  fNombre = signal('');
  fCorreo = signal('');
  fId = signal<number | null>(null);
  fRol = signal<RolUsuario | ''>('');

  hayFiltros = computed(() => !!this.fNombre() || !!this.fCorreo() || this.fId() !== null || !!this.fRol());

  visibles = computed(() => {
    const nombre = normalizar(this.fNombre());
    const correo = normalizar(this.fCorreo());
    const id = this.fId();
    const rol = this.fRol();
    return this.usuarios().filter(
      x =>
        (!nombre || normalizar(x.nombre).includes(nombre) || normalizar(x.username).includes(nombre)) &&
        (!correo || normalizar(x.correo).includes(correo)) &&
        (id === null || x.id === id) &&
        (!rol || x.rol === rol)
    );
  });

  editandoId: number | null = null;
  /** Se fija al empezar a editar: el usuario puede cambiar su propio nombre de usuario sin perder la restricción sobre su rol. */
  editandoPropio = false;
  nombre = '';
  correo = '';
  username = '';
  password = '';
  rol: RolUsuario = 'CONSULTANTE';

  error = signal('');
  exito = signal('');

  recargar(): void {
    this.svc.cargar();
  }

  limpiarFiltros(): void {
    this.fNombre.set('');
    this.fCorreo.set('');
    this.fId.set(null);
    this.fRol.set('');
  }

  editar(u: UsuarioDTO): void {
    this.editandoId = u.id;
    this.editandoPropio = u.username === this.auth.usuario();
    this.nombre = u.nombre;
    this.correo = u.correo;
    this.username = u.username;
    this.password = '';
    this.rol = u.rol;
    this.error.set('');
    this.exito.set('');
  }

  cancelar(): void {
    this.editandoId = null;
    this.editandoPropio = false;
    this.nombre = '';
    this.correo = '';
    this.username = '';
    this.password = '';
    this.rol = 'CONSULTANTE';
  }

  async guardar(): Promise<void> {
    const editando = this.editandoId !== null;
    const resultado =
      this.editandoId === null
        ? await this.svc.crear({
            nombre: this.nombre,
            correo: this.correo,
            username: this.username,
            password: this.password,
            rol: this.rol
          })
        : await this.svc.actualizar({
            id: this.editandoId,
            nombre: this.nombre,
            correo: this.correo,
            username: this.username,
            rol: this.rol,
            password: this.password
          });
    this.error.set(resultado ?? '');
    this.exito.set(resultado ? '' : editando ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
    if (!resultado) {
      if (this.editandoPropio) this.auth.renombrar(this.username.trim());
      this.cancelar();
    }
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.svc.eliminar(id);
    this.error.set(resultado ?? '');
    this.exito.set('');
  }
}
