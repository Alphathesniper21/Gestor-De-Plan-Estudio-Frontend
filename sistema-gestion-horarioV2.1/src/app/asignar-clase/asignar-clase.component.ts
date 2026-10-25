import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HorarioService } from '../services/horario.service';
import { Dia } from '../models/horario.model';

@Component({
  selector: 'app-asignar-clase',
  templateUrl: './asignar-clase.component.html',
  styleUrl: './asignar-clase.component.css',
  standalone: false
})
export class AsignarClaseComponent {
  private svc = inject(HorarioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  materias = this.svc.materias;
  aulas = this.svc.aulas;
  dias = this.svc.dias;

  materiaId: number | null = null;
  grupo: number | null = null;
  aulaId: number | null = null;
  cupoMaximo: number | null = 30;
  dia: Dia = 'Lunes';
  horaInicio = 8;

  error = signal('');
  exito = signal(false);
  enviando = signal(false);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const d = params.get('dia') as Dia | null;
    const h = Number(params.get('hora'));
    if (d && this.dias.includes(d)) this.dia = d;
    if (h) this.horaInicio = h;
  }

  get horaFin(): number {
    return this.horaInicio + 2;
  }

  horasDisponibles(): number[] {
    return this.svc.horasValidas(this.dia);
  }

  fmt(h: number): string {
    return this.svc.formatoHora(h);
  }

  nombreMateria(): string {
    return this.materias().find(m => m.codigo === this.materiaId)?.nombre ?? 'Selecciona una materia';
  }

  etiquetaAula(): string {
    return this.aulaId === null ? 'Selecciona un aula' : `Aula ${this.aulaId}`;
  }

  color(): string {
    return this.svc.colorDe(this.materiaId ?? 0);
  }

  async asignar(): Promise<void> {
    this.enviando.set(true);
    const resultado = await this.svc.asignar({
      idGrupo: this.grupo,
      materiaId: this.materiaId,
      aulaId: this.aulaId,
      cupoMaximo: this.cupoMaximo,
      dia: this.dia,
      horaInicio: this.horaInicio
    });
    this.enviando.set(false);
    this.error.set(resultado ?? '');
    this.exito.set(!resultado);
  }

  limpiar(): void {
    this.materiaId = null;
    this.grupo = null;
    this.aulaId = null;
    this.cupoMaximo = 30;
    this.dia = 'Lunes';
    this.horaInicio = 8;
    this.error.set('');
    this.exito.set(false);
  }

  verHorario(): void {
    this.router.navigate(['/horario']);
  }
}
