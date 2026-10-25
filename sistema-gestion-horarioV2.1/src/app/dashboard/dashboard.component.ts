import { Component, computed, inject } from '@angular/core';
import { HorarioService } from '../services/horario.service';
import { Dia } from '../models/horario.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: false
})
export class DashboardComponent {
  svc = inject(HorarioService);

  private nombresDia: (Dia | null)[] = [null, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  hoy = this.nombresDia[new Date().getDay()];

  clasesHoy = computed(() =>
    this.svc.clases()
      .filter(c => c.dia === this.hoy)
      .sort((a, b) => a.horaInicio - b.horaInicio)
  );
}
