export type RolUsuario = 'GESTOR' | 'CONSULTANTE';

export interface UsuarioDTO {
  id: number;
  nombre: string;
  correo: string;
  username: string;
  password?: string;
  rol: RolUsuario;
}

export interface AuthResponse {
  token: string;
  rol: RolUsuario;
}
