import { Component, inject, signal } from '@angular/core';
import { HorarioService } from '../services/horario.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
  standalone: false
})
export class MainLayoutComponent {
  svc = inject(HorarioService);
  menuAbierto = signal(true);

  alternarMenu(): void {
    this.menuAbierto.update(v => !v);
  }
}
