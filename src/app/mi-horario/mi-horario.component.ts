import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { ClaseHorario, Dia } from '../models/horario.model';

@Component({
  selector: 'app-mi-horario',
  templateUrl: './mi-horario.component.html',
  styleUrl: './mi-horario.component.css',
  standalone: false
})
export class MiHorarioComponent {
  private svc = inject(HorarioService);
  private router = inject(Router);
  auth = inject(AuthService);

  clases = this.svc.clases;
  dias = this.svc.dias;
  horas = this.svc.horasGrilla;
  aviso = this.svc.avisoSesiones;
  seleccionada = signal<ClaseHorario | null>(null);

  fmt(h: number): string {
    return this.svc.formatoHora(h);
  }

  col(dia: Dia): number {
    return this.dias.indexOf(dia) + 2;
  }

  fila(hora: number): number {
    return hora - this.horas[0] + 2;
  }

  asignarEn(dia: Dia, hora: number): void {
    if (!this.auth.esGestor()) return;
    this.router.navigate(['/horario/asignar'], { queryParams: { dia, hora } });
  }

  async eliminar(clase: ClaseHorario): Promise<void> {
    await this.svc.eliminarSesion(clase.id);
    this.seleccionada.set(null);
  }
}
