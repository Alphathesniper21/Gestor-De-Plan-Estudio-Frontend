import { Component, computed, inject } from '@angular/core';
import { HorarioService } from '../services/horario.service';
import { ClaseHorario } from '../models/horario.model';

@Component({
  selector: 'app-mis-clases',
  templateUrl: './mis-clases.component.html',
  standalone: false
})
export class MisClasesComponent {
  private svc = inject(HorarioService);

  lista = computed(() =>
    [...this.svc.clases()].sort(
      (a, b) =>
        this.svc.dias.indexOf(a.dia) - this.svc.dias.indexOf(b.dia) || a.horaInicio - b.horaInicio
    )
  );

  fmt(h: number): string {
    return this.svc.formatoHora(h);
  }

  eliminar(clase: ClaseHorario): void {
    this.svc.eliminar(clase.id);
  }
}
