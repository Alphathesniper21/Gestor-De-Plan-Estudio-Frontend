import { HttpErrorResponse } from '@angular/common/http';
import { mensajeHttp } from './http-error';

/**
 * Suite de pruebas unitarias para la función utilitaria {@link mensajeHttp}.
 *
 * Verifica la traducción de errores HTTP del servidor en mensajes legibles
 * para el usuario (sección 5.6.4 del informe).
 */
describe('mensajeHttp', () => {
  it('debería retornar el texto de negocio enviado por el backend en err.error', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: 'Cada sesion debe durar exactamente 2 horas'
    });

    expect(mensajeHttp(err)).toBe('Cada sesion debe durar exactamente 2 horas');
  });

  it('debería retornar mensaje de sesión expirada cuando el estado es 401', () => {
    const err = new HttpErrorResponse({ status: 401 });

    expect(mensajeHttp(err)).toBe('Tu sesión expiró. Inicia sesión de nuevo.');
  });

  it('debería retornar mensaje de falta de permisos cuando el estado es 403', () => {
    const err = new HttpErrorResponse({ status: 403 });

    expect(mensajeHttp(err)).toBe('Tu rol no tiene permiso para esta acción.');
  });

  it('debería retornar mensaje de falta de conexión cuando el estado es 0 o nulo', () => {
    const err = new HttpErrorResponse({ status: 0 });

    expect(mensajeHttp(err)).toBe('No se pudo conectar con el servidor.');
    expect(mensajeHttp(null)).toBe('No se pudo conectar con el servidor.');
  });

  it('debería retornar mensaje de error interno cuando el estado es >= 500', () => {
    const err = new HttpErrorResponse({ status: 500 });

    expect(mensajeHttp(err)).toContain('El servidor no pudo procesar la solicitud');
  });

  it('debería retornar mensaje genérico de rechazo para otros códigos 4xx sin cuerpo de texto', () => {
    const err = new HttpErrorResponse({ status: 404, error: { detalle: 'no texto' } });

    expect(mensajeHttp(err)).toBe('El servidor rechazó la solicitud.');
  });
});
