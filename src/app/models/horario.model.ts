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
}

export interface NuevaSesion {
  grupoId: number | null;
  dia: Dia;
  horaInicio: number;
}
