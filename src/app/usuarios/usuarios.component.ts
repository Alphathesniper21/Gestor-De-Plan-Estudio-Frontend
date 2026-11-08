import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { RolUsuario } from '../models/usuario.dto';

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

  nombre = '';
  correo = '';
  username = '';
  password = '';
  rol: RolUsuario = 'CONSULTANTE';

  error = signal('');
  exito = signal(false);

  recargar(): void {
    this.svc.cargar();
  }

  async crear(): Promise<void> {
    const resultado = await this.svc.crear({
      nombre: this.nombre,
      correo: this.correo,
      username: this.username,
      password: this.password,
      rol: this.rol
    });
    this.error.set(resultado ?? '');
    this.exito.set(!resultado);
    if (!resultado) {
      this.nombre = '';
      this.correo = '';
      this.username = '';
      this.password = '';
      this.rol = 'CONSULTANTE';
    }
  }

  async eliminar(id: number): Promise<void> {
    const resultado = await this.svc.eliminar(id);
    this.error.set(resultado ?? '');
    this.exito.set(false);
  }
}
