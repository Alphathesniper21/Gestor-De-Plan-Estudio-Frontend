import { Component, computed, inject, signal } from '@angular/core';
import { ParametroService } from '../services/parametro.service';
import { HorarioService } from '../services/horario.service';
import { ParametroDTO } from '../models/parametro.dto';

interface Meta {
  etiqueta: string;
  tipo: 'time' | 'number' | 'text';
  ayuda: string;
  min?: number;
  max?: number;
  step?: number;
}

const META: Record<string, Meta> = {
  'hora.inicio.jornada': { etiqueta: 'Inicio de la jornada', tipo: 'time', ayuda: 'Hora de apertura de lunes a sábado.' },
  'hora.fin.semana': { etiqueta: 'Cierre de lunes a viernes', tipo: 'time', ayuda: 'Ninguna sesión puede terminar después de esta hora.' },
  'hora.fin.sabado': { etiqueta: 'Cierre del sábado', tipo: 'time', ayuda: 'Ninguna sesión del sábado puede terminar después de esta hora.' },
  'pausa.inicio': { etiqueta: 'Inicio de la pausa del mediodía', tipo: 'time', ayuda: 'No se programan clases dentro de la pausa.' },
  'pausa.fin': { etiqueta: 'Fin de la pausa del mediodía', tipo: 'time', ayuda: 'Debe ser posterior al inicio de la pausa.' },
  'cupo.base': { etiqueta: 'Cupo base por grupo', tipo: 'number', ayuda: 'Número entero entre 1 y 200.', min: 1, max: 200, step: 1 },
  'cupo.tolerancia': { etiqueta: 'Tolerancia del cupo', tipo: 'number', ayuda: 'Entre 0 y 1 (0.10 equivale a 10 %).', min: 0, max: 1, step: 0.05 },
  'sesiones.maximas': { etiqueta: 'Máximo de sesiones semanales por materia', tipo: 'number', ayuda: 'Entre 1 y 10. Cada sesión dura 2 horas.', min: 1, max: 10, step: 1 }
};

@Component({
  selector: 'app-parametros',
  templateUrl: './parametros.component.html',
  styleUrl: './parametros.component.css',
  standalone: false
})
export class ParametrosComponent {
  private svc = inject(ParametroService);
  private horario = inject(HorarioService);

  fueraDeHorario = this.horario.clasesFueraDeHorario;

  cupoMaximo = this.svc.cupoMaximo;
  cargando = this.svc.cargando;
  errorApi = this.svc.errorApi;

  borradores = signal<Record<string, string>>({});
  guardando = signal(false);
  error = signal('');
  exito = signal('');

  filas = computed(() =>
    this.svc.parametros().map(p => ({
      ...p,
      meta: META[p.clave] ?? ({ etiqueta: p.clave, tipo: 'text', ayuda: '' } as Meta)
    }))
  );

  recargar(): void {
    this.svc.cargar();
  }

  valorDe(p: ParametroDTO): string {
    return this.borradores()[p.clave] ?? p.valor;
  }

  modificado(p: ParametroDTO): boolean {
    return this.valorDe(p) !== p.valor;
  }

  cambiar(clave: string, valor: unknown): void {
    this.borradores.update(b => ({ ...b, [clave]: String(valor ?? '') }));
  }

  async guardar(p: ParametroDTO & { meta: Meta }): Promise<void> {
    this.guardando.set(true);
    this.error.set('');
    this.exito.set('');
    const resultado = await this.svc.actualizar(p.clave, this.valorDe(p));
    this.guardando.set(false);
    if (resultado) {
      this.error.set(`${p.meta.etiqueta}: ${resultado}`);
      return;
    }
    this.borradores.update(b => {
      const copia = { ...b };
      delete copia[p.clave];
      return copia;
    });
    this.exito.set(`${p.meta.etiqueta} actualizado correctamente.`);
  }
}
