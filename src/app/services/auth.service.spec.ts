import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { AuthResponse } from '../models/usuario.dto';

/**
 * Suite de pruebas unitarias para {@link AuthService}.
 *
 * Verifica el inicio de sesión contra `/auth/login` (CU01), el almacenamiento
 * del token JWT y del rol en `localStorage`, el cálculo de señales derivadas
 * (`logueado`, `esGestor`, `iniciales`), la validación de expiración del JWT
 * (`exp`, RNF-4) y el cierre de sesión.
 */
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  /** Construye un JWT sintético con el claim `exp` indicado (en segundos UNIX). */
  const crearJwtConExp = (expSegundos: number): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'gestor', exp: expSegundos }));
    return `${header}.${payload}.firma`;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('login() debería retornar mensaje de validación si el usuario o la contraseña están vacíos', async () => {
    const resultado = await service.login('   ', '');

    expect(resultado).toBe('Ingresa tu usuario y contraseña.');
  });

  it('login() exitoso debería hacer POST a /auth/login, guardar token, rol y usuario, y retornar null', async () => {
    const mockRespuesta: AuthResponse = { token: 'jwt-token-valido', rol: 'GESTOR' };

    const promesa = service.login('gestor', 'Admin123');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.get('nombreUsuario')).toBe('gestor');
    expect(req.request.body.get('contrasenia')).toBe('Admin123');
    req.flush(mockRespuesta);

    const resultado = await promesa;

    expect(resultado).toBeNull();
    expect(localStorage.getItem('token')).toBe('jwt-token-valido');
    expect(localStorage.getItem('rol')).toBe('GESTOR');
    expect(localStorage.getItem('usuario')).toBe('gestor');
    expect(service.logueado()).toBeTrue();
    expect(service.esGestor()).toBeTrue();
    expect(service.iniciales()).toBe('GE');
  });

  it('login() debería retornar "Credenciales inválidas." cuando el servidor responde 401', async () => {
    const promesa = service.login('gestor', 'claveErronea');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush('Credenciales invalidas', { status: 401, statusText: 'Unauthorized' });

    const resultado = await promesa;
    expect(resultado).toBe('Credenciales inválidas.');
  });

  it('sesionValida() debería retornar true para un token JWT cuya fecha de expiración es futura', () => {
    const expFuturo = Math.floor(Date.now() / 1000) + 3600; // +60 minutos (RNF-4)
    service.token.set(crearJwtConExp(expFuturo));

    expect(service.sesionValida()).toBeTrue();
  });

  it('sesionValida() debería retornar false cuando el token JWT ya expiró o cuando no hay token', () => {
    expect(service.sesionValida()).toBeFalse();

    const expPasado = Math.floor(Date.now() / 1000) - 60;
    service.token.set(crearJwtConExp(expPasado));

    expect(service.sesionValida()).toBeFalse();
  });

  it('logout() debería limpiar el localStorage, reiniciar las señales y navegar a /login', () => {
    spyOn(router, 'navigate');
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('rol', 'GESTOR');
    localStorage.setItem('usuario', 'gestor');
    service.token.set('jwt');
    service.rol.set('GESTOR');
    service.usuario.set('gestor');

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('rol')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
    expect(service.logueado()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
