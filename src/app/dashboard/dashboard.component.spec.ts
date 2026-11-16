import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { PublicacionService } from '../services/publicacion.service';
import { ClaseHorario, Dia } from '../models/horario.model';

/**
 * Suite de pruebas unitarias para {@link DashboardComponent}.
 *
 * Verifica la carga del estado de publicación y pendientes al inicializar, el
 * cálculo de barras de sesiones por día y la acción de publicar el horario
 * (CU08, RF-11, RF-12).
 */
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let publicacionStub: Partial<PublicacionService> & {
    cargar: jasmine.Spy;
    publicar: jasmine.Spy;
  };

  beforeEach(async () => {
    const authStub: Partial<AuthService> = {
      usuario: signal('gestor'),
      esGestor: signal(true)
    };

    const horarioStub: Partial<HorarioService> = {
      totalMaterias: signal(5),
      totalGrupos: signal(4),
      totalSesiones: signal(8),
      totalHoras: signal(16),
      clases: signal<ClaseHorario[]>([]),
      porDia: signal<{ dia: Dia; sesiones: number }[]>([
        { dia: 'Lunes', sesiones: 4 },
        { dia: 'Martes', sesiones: 2 }
      ]),
      formatoHora: (h: number) => `${String(h).padStart(2, '0')}:00`,
      motivoFueraDeHorario: () => ''
    };

    publicacionStub = {
      publicado: signal(false),
      pendientes: signal([]),
      fueraDeHorario: signal([]),
      error: signal(''),
      cargar: jasmine.createSpy('cargar'),
      publicar: jasmine.createSpy('publicar').and.resolveTo(null)
    };

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [RouterModule.forRoot([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: HorarioService, useValue: horarioStub },
        { provide: PublicacionService, useValue: publicacionStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente y consultar el estado de publicación al iniciar', () => {
    expect(component).toBeTruthy();
    expect(publicacionStub.cargar).toHaveBeenCalledTimes(1);
  });

  it('ancho() debería calcular el porcentaje relativo al día con mayor número de sesiones', () => {
    expect(component.ancho(4)).toBe(100);
    expect(component.ancho(2)).toBe(50);
  });

  it('publicar() debería activar exitoPublicar cuando la publicación no retorna errores', async () => {
    publicacionStub.publicar.and.resolveTo(null);

    await component.publicar();

    expect(component.errorPublicar()).toBe('');
    expect(component.exitoPublicar()).toBeTrue();
  });

  it('publicar() debería mostrar el mensaje de error cuando hay grupos pendientes', async () => {
    publicacionStub.publicar.and.resolveTo('No se puede publicar: hay 1 grupo(s) con sesiones pendientes.');

    await component.publicar();

    expect(component.errorPublicar()).toContain('grupo(s) con sesiones pendientes');
    expect(component.exitoPublicar()).toBeFalse();
  });
});
