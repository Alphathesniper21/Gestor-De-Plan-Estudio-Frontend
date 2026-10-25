export interface UsuarioDTO {
  nombre: string;
  codigo: number;
  correo: string;
  facultad: string;
}

export interface ProfesorDTO extends UsuarioDTO {
  tituloPregrado: string;
  actaGradoPregrado: string;
  tituloPosgrado: string;
  nivelPosgrado: string;
  tituloExtranjero: boolean;
  resolucionConvalidacion: string;
  horasFormacionPedagogica: number;
  maximoNivelFormacion: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tarjetaProfesional: string;
  rut: string;
  eps: string;
  fondoPensiones: string;
  tieneVisaTrabajo: boolean;
  especialidades: string[];
  aniosExperiencia: number;
  publicaciones: string[];
  nivelIngles: string;
  examenIngles: string;
  puntajeIngles: number;
  hojaVidaActualizada: boolean;
}
