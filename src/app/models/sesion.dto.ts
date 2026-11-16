export interface SesionDTO {
  id: number;
  grupoId: number;
  diaSemana: number;
  horaInicio: string | number[];
  horaFin: string | number[];
  /** Si el back la envía, manda sobre el estado local: el consultante solo ve las publicadas. */
  publicada?: boolean;
}
