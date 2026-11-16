import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard, gestorGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

/**
 * Suite de pruebas unitarias para los guards de autenticación y autorización
 * ({@link authGuard} y {@link gestorGuard}).
 *
 * Verifica el control de acceso a las rutas protegidas según la vigencia de la
 * sesión JWT y el rol del usuario (RS-8, RNF-4).
 */
describe('Auth Guards', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'sesionValida',
      'cerrarSesionLocal',
      'esGestor'
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('debería permitir el acceso cuando la sesión es válida', () => {
      authServiceSpy.sesionValida.and.returnValue(true);

      const resultado = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(resultado).toBeTrue();
      expect(authServiceSpy.cerrarSesionLocal).not.toHaveBeenCalled();
    });

    it('debería cerrar la sesión local y redirigir a /login cuando la sesión no es válida', () => {
      authServiceSpy.sesionValida.and.returnValue(false);

      const resultado = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(authServiceSpy.cerrarSesionLocal).toHaveBeenCalledTimes(1);
      expect(resultado instanceof UrlTree).toBeTrue();
      expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
    });
  });

  describe('gestorGuard', () => {
    it('debería permitir el acceso si el usuario tiene rol GESTOR', () => {
      authServiceSpy.esGestor.and.returnValue(true);

      const resultado = TestBed.runInInjectionContext(() =>
        gestorGuard(mockRoute, mockState)
      );

      expect(resultado).toBeTrue();
    });

    it('debería redirigir a /horario si el usuario no es GESTOR (CONSULTANTE)', () => {
      authServiceSpy.esGestor.and.returnValue(false);

      const resultado = TestBed.runInInjectionContext(() =>
        gestorGuard(mockRoute, mockState)
      );

      expect(resultado instanceof UrlTree).toBeTrue();
      expect(router.serializeUrl(resultado as UrlTree)).toBe('/horario');
    });
  });
});
