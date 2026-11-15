import { HttpErrorResponse } from '@angular/common/http';

/** Texto para el usuario a partir de un error HTTP. El back responde el motivo como texto en los 4xx de negocio. */
export function mensajeHttp(e: unknown): string {
  const err = e as HttpErrorResponse;
  if (typeof err?.error === 'string' && err.error) return err.error;
  if (err?.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
  if (err?.status === 403) return 'Tu rol no tiene permiso para esta acción.';
  if (!err || err.status === 0) return 'No se pudo conectar con el servidor.';
  if (err.status >= 500) return 'El servidor no pudo procesar la solicitud. Revisa los datos o inténtalo de nuevo.';
  return 'El servidor rechazó la solicitud.';
}
