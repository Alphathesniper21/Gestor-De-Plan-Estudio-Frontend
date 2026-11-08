import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
  standalone: false
})
export class MainLayoutComponent {
  auth = inject(AuthService);
  svc = inject(HorarioService);

  menuAbierto = signal(window.innerWidth > 900);

  alternarMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  cerrarEnMovil(): void {
    if (window.innerWidth <= 900) this.menuAbierto.set(false);
  }

  salir(): void {
    this.auth.logout();
  }
}
