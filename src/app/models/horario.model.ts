export type Dia = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

export interface ClaseHorario {
  id: number;
  grupoId: number;
  materiaId: number;
  materia: string;
  grupo: string;
  dia: Dia;
  horaInicio: number;
  horaFin: number;
  color: string;
  /** false = borrador: solo la ve el gestor hasta que se publique el horario. */
  publicada: boolean;
}

export interface NuevaSesion {
  grupoId: number | null;
  dia: Dia;
  horaInicio: number;
}
