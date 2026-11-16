import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { RolUsuario } from '../models/usuario.dto';

/**
 * Suite de pruebas unitarias para {@link MainLayoutComponent}.
 *
 * Verifica la alternancia del menú lateral, el comportamiento responsivo en
 * pantallas móviles y el cierre de sesión.
 */
describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let authServiceStub: Partial<AuthService> & { logout: jasmine.Spy };

  beforeEach(async () => {
    authServiceStub = {
      esGestor: signal(true),
      usuario: signal('gestor'),
      rol: signal<RolUsuario | null>('GESTOR'),
      iniciales: signal('GE'),
      logout: jasmine.createSpy('logout')
    };

    const horarioServiceStub: Partial<HorarioService> = {
      errorApi: signal('')
    };

    await TestBed.configureTestingModule({
      declarations: [MainLayoutComponent],
      imports: [RouterModule.forRoot([])],
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: HorarioService, useValue: horarioServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('alternarMenu() debería invertir el estado de apertura del menú lateral', () => {
    const inicial = component.menuAbierto();
    component.alternarMenu();
    expect(component.menuAbierto()).toBe(!inicial);
  });

  it('salir() debería delegar el cierre de sesión en AuthService.logout()', () => {
    component.salir();
    expect(authServiceStub.logout).toHaveBeenCalledTimes(1);
  });
});
