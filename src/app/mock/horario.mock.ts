import { GrupoDTO } from '../models/grupo.dto';
import { MateriaDTO } from '../models/materia.dto';
import { SesionDTO } from '../models/sesion.dto';

export const MATERIAS_MOCK: MateriaDTO[] = [
  { id: 1, nombre: 'Cálculo Diferencial', semestre: 1, ncreditos: 3, horasDeLaMateria: 4, correlativa: false },
  { id: 2, nombre: 'Estructuras de Datos', semestre: 3, ncreditos: 3, horasDeLaMateria: 4, correlativa: true },
  { id: 3, nombre: 'Lógica Digital', semestre: 2, ncreditos: 3, horasDeLaMateria: 4, correlativa: false },
  { id: 4, nombre: 'Programación Orientada a Objetos', semestre: 2, ncreditos: 3, horasDeLaMateria: 4, correlativa: true },
  { id: 5, nombre: 'Bases de Datos', semestre: 4, ncreditos: 3, horasDeLaMateria: 4, correlativa: true },
  { id: 6, nombre: 'Ingeniería de Software', semestre: 5, ncreditos: 3, horasDeLaMateria: 4, correlativa: true }
];

export const GRUPOS_MOCK: GrupoDTO[] = [
  { id: 1, materiaId: 1, numeroGrupo: 1, cupoPlaneado: 35 },
  { id: 2, materiaId: 2, numeroGrupo: 1, cupoPlaneado: 30 },
  { id: 3, materiaId: 3, numeroGrupo: 1, cupoPlaneado: 25 },
  { id: 4, materiaId: 2, numeroGrupo: 2, cupoPlaneado: 30 }
];

export const SESIONES_MOCK: SesionDTO[] = [
  { id: 1, grupoId: 1, diaSemana: 1, horaInicio: '08:00:00', horaFin: '10:00:00' },
  { id: 2, grupoId: 1, diaSemana: 3, horaInicio: '08:00:00', horaFin: '10:00:00' },
  { id: 3, grupoId: 2, diaSemana: 2, horaInicio: '10:00:00', horaFin: '12:00:00' },
  { id: 4, grupoId: 2, diaSemana: 4, horaInicio: '14:00:00', horaFin: '16:00:00' },
  { id: 5, grupoId: 3, diaSemana: 5, horaInicio: '14:00:00', horaFin: '16:00:00' },
  { id: 6, grupoId: 4, diaSemana: 1, horaInicio: '14:00:00', horaFin: '16:00:00' }
];
