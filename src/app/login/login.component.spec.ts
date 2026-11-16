import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';

/**
 * Suite de pruebas unitarias para {@link LoginComponent}.
 *
 * Verifica el flujo de inicio de sesión (CU01), el redireccionamiento a
 * `/dashboard` cuando las credenciales son válidas y la visualización del
 * mensaje de error cuando son rechazadas.
 */
describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [FormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('ingresar() debería navegar a /dashboard cuando el login es exitoso', async () => {
    authServiceSpy.login.and.resolveTo(null);
    spyOn(router, 'navigate');
    component.usuario = 'gestor';
    component.clave = 'Admin123';

    await component.ingresar();

    expect(authServiceSpy.login).toHaveBeenCalledWith('gestor', 'Admin123');
    expect(component.error()).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('ingresar() debería establecer el mensaje de error y no navegar cuando el login falla', async () => {
    authServiceSpy.login.and.resolveTo('Credenciales inválidas.');
    spyOn(router, 'navigate');
    component.usuario = 'gestor';
    component.clave = 'incorrecta';

    await component.ingresar();

    expect(component.error()).toBe('Credenciales inválidas.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
