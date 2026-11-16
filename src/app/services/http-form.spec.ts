import { formulario } from './http-form';

/**
 * Suite de pruebas unitarias para la función utilitaria {@link formulario}.
 *
 * Verifica la construcción de parámetros `application/x-www-form-urlencoded`
 * con codificación estricta de caracteres especiales y omisión de nulos.
 */
describe('formulario', () => {
  it('debería incluir claves con valores de texto, numéricos y booleanos', () => {
    const params = formulario({
      codigo: 1001,
      nombre: 'Programación I',
      correlativa: true
    });

    expect(params.get('codigo')).toBe('1001');
    expect(params.get('nombre')).toBe('Programación I');
    expect(params.get('correlativa')).toBe('true');
  });

  it('debería omitir las propiedades con valor null o undefined', () => {
    const params = formulario({
      id: 5,
      password: null,
      opcional: undefined
    });

    expect(params.get('id')).toBe('5');
    expect(params.has('password')).toBeFalse();
    expect(params.has('opcional')).toBeFalse();
  });

  it('debería codificar caracteres especiales en contraseñas y correos con encodeURIComponent', () => {
    const params = formulario({
      correo: 'gestor+1@unbosque.edu.co',
      password: 'Clave=Segura&2026?'
    });

    const serializado = params.toString();
    expect(serializado).toContain('correo=gestor%2B1%40unbosque.edu.co');
    expect(serializado).toContain('password=Clave%3DSegura%262026%3F');
  });
});
