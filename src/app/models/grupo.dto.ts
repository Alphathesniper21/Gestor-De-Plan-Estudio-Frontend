export interface GrupoDTO {
  id: number;
  materiaId: number;
  /** El back lo agrega al listar grupos; puede venir null si la materia ya no existe. */
  nombreMateria?: string | null;
  numeroGrupo: number;
  cupoPlaneado: number;
}
