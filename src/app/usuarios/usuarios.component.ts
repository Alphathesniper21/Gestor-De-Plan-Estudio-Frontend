import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { RolUsuario, UsuarioDTO } from '../models/usuario.dto';

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

  editandoId: number | null = null;
  nombre = '';
  correo = '';
  username = '';
  password = '';
  rol: RolUsuario = 'CONSULTANTE';

  error = signal('');
  exito = signal('');

  get editandoMiCuenta(): boolean {
    return this.editandoId !== null && this.username === this.auth.usuario();
  }

  recargar(): void {
    this.svc.cargar();
  }

  editar(u: UsuarioDTO): void {
    this.editandoId = u.id;
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
            rol: this.rol,
            password: this.password
          });
    this.error.set(resultado ?? '');
    this.exito.set(resultado ? '' : editando ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
    if (!resultado) this.cancelar();
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.svc.eliminar(id);
    this.error.set(resultado ?? '');
    this.exito.set('');
  }
}
