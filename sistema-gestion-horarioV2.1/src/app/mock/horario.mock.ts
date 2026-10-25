import { AulaDTO } from '../models/aula.dto';
import { GrupoDTO } from '../models/grupo.dto';
import { MateriaDTO } from '../models/materia.dto';

export const MATERIAS_MOCK: MateriaDTO[] = [
  { codigo: 1001, nombre: 'Cálculo Diferencial', semestre: 1, ncreditos: 3, horasDeLaMateria: 4, correlativa: false },
  { codigo: 1002, nombre: 'Estructuras de Datos', semestre: 3, ncreditos: 3, horasDeLaMateria: 4, correlativa: true },
  { codigo: 1003, nombre: 'Física II', semestre: 3, ncreditos: 3, horasDeLaMateria: 4, correlativa: true },
  { codigo: 1004, nombre: 'Lógica Digital', semestre: 2, ncreditos: 3, horasDeLaMateria: 4, correlativa: false },
  { codigo: 1005, nombre: 'Programación Orientada a Objetos', semestre: 2, ncreditos: 3, horasDeLaMateria: 4, correlativa: true },
  { codigo: 1006, nombre: 'Bases de Datos', semestre: 4, ncreditos: 3, horasDeLaMateria: 4, correlativa: true },
  { codigo: 1007, nombre: 'Ingeniería de Software', semestre: 5, ncreditos: 3, horasDeLaMateria: 4, correlativa: true }
];

export const AULAS_MOCK: AulaDTO[] = [
  { id: 1, capacidad: 30, tieneSillasMovibles: true, tieneComputadores: false },
  { id: 2, capacidad: 40, tieneSillasMovibles: false, tieneComputadores: false },
  { id: 3, capacidad: 25, tieneSillasMovibles: true, tieneComputadores: true },
  { id: 4, capacidad: 25, tieneSillasMovibles: false, tieneComputadores: true },
  { id: 5, capacidad: 35, tieneSillasMovibles: true, tieneComputadores: false }
];

export const GRUPOS_MOCK: GrupoDTO[] = [
  { idGrupo: 1, materiaId: 1002, docenteId: 1, aulaId: 2, cupoMaximo: 30, estudiantesInscritos: 24, diaSemana: 'Lunes', horaInicio: '08:00:00', horaFin: '10:00:00' },
  { idGrupo: 2, materiaId: 1004, docenteId: 1, aulaId: 3, cupoMaximo: 25, estudiantesInscritos: 20, diaSemana: 'Miércoles', horaInicio: '10:00:00', horaFin: '12:00:00' },
  { idGrupo: 3, materiaId: 1003, docenteId: 1, aulaId: 4, cupoMaximo: 25, estudiantesInscritos: 18, diaSemana: 'Viernes', horaInicio: '14:00:00', horaFin: '16:00:00' }
];
