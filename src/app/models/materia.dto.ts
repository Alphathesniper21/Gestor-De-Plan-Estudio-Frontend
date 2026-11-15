export interface MateriaDTO {
  id: number;
  /** Código institucional de la materia (único). */
  codigo: number;
  nombre: string;
  semestre: number;
  ncreditos: number;
  horasDeLaMateria: number;
  correlativa: boolean;
  sesionesSemanales?: number;
}

export type NuevaMateria = Omit<MateriaDTO, 'id'>;
