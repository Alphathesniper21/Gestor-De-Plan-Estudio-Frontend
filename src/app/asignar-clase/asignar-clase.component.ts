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

  grupos = this.svc.gruposEtiquetados;
  dias = this.svc.dias;
  aviso = this.svc.avisoSesiones;
  pausa = this.svc.textoPausa;

  grupoId: number | null = null;
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
    if (h) {
      if (this.horasDisponibles().includes(h)) {
        this.horaInicio = h;
      } else {
        this.ajustarHora();
        this.error.set(this.motivoHora(h));
      }
    } else {
      this.ajustarHora();
    }
  }

  cambiarDia(dia: Dia): void {
    this.dia = dia;
    this.ajustarHora();
  }

  /** Si la hora elegida no es válida para el día, usa la primera que sí lo sea. */
  private ajustarHora(): void {
    const validas = this.horasDisponibles();
    if (validas.length && !validas.includes(this.horaInicio)) this.horaInicio = validas[0];
  }

  private motivoHora(h: number): string {
    const base = this.svc.cruzaPausa(h)
      ? `Una sesión que inicie a las ${this.fmt(h)} cruza la franja de almuerzo (${this.pausa()}).`
      : `No se puede iniciar una sesión de 2 horas a las ${this.fmt(h)} el ${this.dia}.`;
    return `${base} Elige otra hora de inicio.`;
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

  etiquetaGrupo(): string {
    return this.grupos().find(g => g.id === this.grupoId)?.etiqueta ?? 'Selecciona un grupo';
  }

  color(): string {
    return this.svc.colorDe(this.svc.materiaDeGrupo(this.grupoId));
  }

  async asignar(): Promise<void> {
    this.enviando.set(true);
    const resultado = await this.svc.asignarSesion({
      grupoId: this.grupoId,
      dia: this.dia,
      horaInicio: this.horaInicio
    });
    this.enviando.set(false);
    this.error.set(resultado ?? '');
    this.exito.set(!resultado);
  }

  limpiar(): void {
    this.grupoId = null;
    this.dia = 'Lunes';
    this.horaInicio = 8;
    this.ajustarHora();
    this.error.set('');
    this.exito.set(false);
  }

  verHorario(): void {
    this.router.navigate(['/horario']);
  }
}
