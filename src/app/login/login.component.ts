import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: false
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = '';
  clave = '';
  error = signal('');
  cargando = signal(false);
  modoPrueba = environment.usarMock;

  async ingresar(): Promise<void> {
    this.cargando.set(true);
    const resultado = await this.auth.login(this.usuario, this.clave);
    this.cargando.set(false);
    if (resultado) {
      this.error.set(resultado);
      return;
    }
    this.router.navigate(['/dashboard']);
  }
}
