export type Dia = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

export interface ClaseHorario {
  id: number;
  materia: string;
  grupo: string;
  aula: string;
  dia: Dia;
  horaInicio: number;
  horaFin: number;
  color: string;
}

export interface NuevaClase {
  idGrupo: number | null;
  materiaId: number | null;
  aulaId: number | null;
  cupoMaximo: number | null;
  dia: Dia;
  horaInicio: number;
}
