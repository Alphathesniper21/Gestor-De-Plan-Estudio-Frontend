import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsuarioService } from './usuario.service';
import { environment } from '../../environments/environment';
import { UsuarioDTO } from '../models/usuario.dto';

/**
 * Suite de pruebas unitarias para {@link UsuarioService}.
 *
 * Verifica la carga del catálogo de usuarios (`/usuario/mostrartodo`), la
 * creación (`/usuario/crear`), la actualización (`/usuario/actualizar`) y la
 * eliminación (`/usuario/eliminar/{id}`).
 */
describe('UsuarioService', () => {
  let service: UsuarioService;
  let httpMock: HttpTestingController;

  const mockUsuarios: UsuarioDTO[] = [
    {
      id: 1,
      nombre: 'Martin Pena',
      correo: 'martin@unbosque.edu.co',
      username: 'martinp',
      rol: 'GESTOR'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UsuarioService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(UsuarioService);
    httpMock = TestBed.inject(HttpTestingController);

    // Resuelve la petición GET inicial disparada en el constructor
    const reqInicial = httpMock.expectOne(`${environment.apiUrl}/usuario/mostrartodo`);
    reqInicial.flush(mockUsuarios);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente y cargar los usuarios iniciales', () => {
    expect(service).toBeTruthy();
    expect(service.usuarios().length).toBe(1);
    expect(service.usuarios()[0].username).toBe('martinp');
  });

  it('crear() debería validar que todos los campos estén completos antes de enviar al servidor', async () => {
    const error = await service.crear({
      nombre: '',
      correo: 'test@unbosque.edu.co',
      username: 'testuser',
      password: 'Password123',
      rol: 'CONSULTANTE'
    });

    expect(error).toBe('Completa todos los campos.');
  });

  it('crear() debería hacer POST a /usuario/crear y recargar la lista', async () => {
    const promesa = service.crear({
      nombre: 'Laura Gomez',
      correo: 'laura@unbosque.edu.co',
      username: 'laurag',
      password: 'Password123',
      rol: 'CONSULTANTE'
    });

    const reqPost = httpMock.expectOne(`${environment.apiUrl}/usuario/crear`);
    expect(reqPost.request.method).toBe('POST');
    expect(reqPost.request.body.get('username')).toBe('laurag');
    reqPost.flush('Usuario creado exitosamente');

    const resultado = await promesa;

    const reqRecarga = httpMock.expectOne(`${environment.apiUrl}/usuario/mostrartodo`);
    reqRecarga.flush(mockUsuarios);

    expect(resultado).toBeNull();
  });

  it('actualizar() debería hacer PUT a /usuario/actualizar omitiendo la contraseña si viene vacía', async () => {
    const promesa = service.actualizar({
      id: 1,
      nombre: 'Martin Actualizado',
      correo: 'martin@unbosque.edu.co',
      username: 'martinp',
      rol: 'GESTOR',
      password: '   '
    });

    const reqPut = httpMock.expectOne(`${environment.apiUrl}/usuario/actualizar`);
    expect(reqPut.request.method).toBe('PUT');
    expect(reqPut.request.body.get('id')).toBe('1');
    expect(reqPut.request.body.get('nombre')).toBe('Martin Actualizado');
    expect(reqPut.request.body.has('password')).toBeFalse();
    reqPut.flush('Usuario actualizado exitosamente');

    const resultado = await promesa;

    const reqRecarga = httpMock.expectOne(`${environment.apiUrl}/usuario/mostrartodo`);
    reqRecarga.flush(mockUsuarios);

    expect(resultado).toBeNull();
  });

  it('eliminar() debería hacer DELETE a /usuario/eliminar/{id} y retirar el usuario de la señal', async () => {
    const promesa = service.eliminar(1);

    const reqDel = httpMock.expectOne(`${environment.apiUrl}/usuario/eliminar/1`);
    expect(reqDel.request.method).toBe('DELETE');
    reqDel.flush('Usuario eliminado exitosamente');

    const resultado = await promesa;
    expect(resultado).toBeNull();
    expect(service.usuarios().length).toBe(0);
  });
});
