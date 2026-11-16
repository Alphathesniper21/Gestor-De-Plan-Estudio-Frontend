import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Suite de pruebas unitarias para {@link jwtInterceptor}.
 *
 * Verifica la inclusión del encabezado `Authorization: Bearer <token>` en las
 * peticiones dirigidas al backend y el cierre automático de sesión ante
 * respuestas 401 o 403 con token vencido (RNF-4).
 */
describe('jwtInterceptor', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let nextFn: jasmine.Spy<HttpHandlerFn>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'token',
      'sesionValida',
      'logout'
    ]);
    nextFn = jasmine.createSpy('next').and.returnValue(of({} as HttpEvent<unknown>));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
  });

  it('debería agregar el header Authorization si hay token y la URL es del backend', () => {
    authServiceSpy.token.and.returnValue('mi-token-jwt-123');
    const req = new HttpRequest('GET', `${environment.apiUrl}/materia/mostrartodo`);

    TestBed.runInInjectionContext(() => jwtInterceptor(req, nextFn));

    const reqCapturada = nextFn.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(reqCapturada.headers.get('Authorization')).toBe('Bearer mi-token-jwt-123');
  });

  it('debería pasar la petición sin modificar si no hay token', () => {
    authServiceSpy.token.and.returnValue(null);
    const req = new HttpRequest('GET', `${environment.apiUrl}/materia/mostrartodo`);

    TestBed.runInInjectionContext(() => jwtInterceptor(req, nextFn));

    const reqCapturada = nextFn.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(reqCapturada.headers.get('Authorization')).toBeNull();
  });

  it('no debería agregar el header Authorization a URLs externas distintas del backend', () => {
    authServiceSpy.token.and.returnValue('mi-token-jwt-123');
    const req = new HttpRequest('GET', 'https://otro-dominio.com/recurso');

    TestBed.runInInjectionContext(() => jwtInterceptor(req, nextFn));

    const reqCapturada = nextFn.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(reqCapturada.headers.get('Authorization')).toBeNull();
  });

  it('debería cerrar la sesión (logout) cuando una ruta protegida responde 401', () => {
    authServiceSpy.token.and.returnValue('token-vencido');
    nextFn.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const req = new HttpRequest('GET', `${environment.apiUrl}/grupo/mostrartodo`);

    TestBed.runInInjectionContext(() => jwtInterceptor(req, nextFn)).subscribe({
      error: () => {}
    });

    expect(authServiceSpy.logout).toHaveBeenCalledTimes(1);
  });

  it('debería cerrar la sesión cuando el backend responde 403 y el token ya expiró', () => {
    authServiceSpy.token.and.returnValue('token-vencido');
    authServiceSpy.sesionValida.and.returnValue(false);
    nextFn.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const req = new HttpRequest('GET', `${environment.apiUrl}/sesion/mostrartodo`);

    TestBed.runInInjectionContext(() => jwtInterceptor(req, nextFn)).subscribe({
      error: () => {}
    });

    expect(authServiceSpy.logout).toHaveBeenCalledTimes(1);
  });

  it('no debería cerrar la sesión si el error 401 proviene de /auth/login', () => {
    authServiceSpy.token.and.returnValue(null);
    nextFn.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const req = new HttpRequest('POST', `${environment.apiUrl}/auth/login`, null);

    TestBed.runInInjectionContext(() => jwtInterceptor(req, nextFn)).subscribe({
      error: () => {}
    });

    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });
});
