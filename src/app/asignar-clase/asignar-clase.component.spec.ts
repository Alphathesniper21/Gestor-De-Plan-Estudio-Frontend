import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AsignarClaseComponent } from './asignar-clase.component';
import { HorarioService } from '../services/horario.service';
import { Dia } from '../models/horario.model';

/**
 * Suite de pruebas unitarias para {@link AsignarClaseComponent}.
 *
 * Verifica la lectura de parámetros iniciales de celda (`dia` y `hora`), el
 * cálculo de la hora de fin de 2 horas, el envío de la sesión al servicio
 * (CU04, RF-3) y el manejo de errores de validación (CU05).
 */
describe('AsignarClaseComponent', () => {
  let component: AsignarClaseComponent;
  let fixture: ComponentFixture<AsignarClaseComponent>;
  let router: Router;
  let horarioStub: Partial<HorarioService> & {
    asignarSesion: jasmine.Spy;
  };

  beforeEach(async () => {
    horarioStub = {
      gruposEtiquetados: signal([
        { id: 1, etiqueta: 'Estructuras de Datos · Grupo 1' }
      ]),
      dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as Dia[],
      avisoSesiones: false,
      textoPausa: signal('12:00 - 13:00'),
      cruzaPausa: () => false,
      horasValidas: () => [7, 8, 9, 10, 13, 14, 15, 16],
      formatoHora: (h: number) => `${String(h).padStart(2, '0')}:00`,
      materiaDeGrupo: () => 101,
      colorDe: () => '#f97316',
      asignarSesion: jasmine.createSpy('asignarSesion').and.resolveTo(null)
    };

    await TestBed.configureTestingModule({
      declarations: [AsignarClaseComponent],
      imports: [FormsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ dia: 'Jueves', hora: '14' })
            }
          }
        },
        { provide: HorarioService, useValue: horarioStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsignarClaseComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('debería crearse correctamente e inicializar el día y la hora desde los queryParams', () => {
    expect(component).toBeTruthy();
    expect(component.dia).toBe('Jueves');
    expect(component.horaInicio).toBe(14);
    expect(component.horaFin).toBe(16);
  });

  it('asignar() debería invocar HorarioService.asignarSesion y activar exito cuando no hay errores', async () => {
    component.grupoId = 1;
    horarioStub.asignarSesion.and.resolveTo(null);

    await component.asignar();

    expect(horarioStub.asignarSesion).toHaveBeenCalledWith({
      grupoId: 1,
      dia: 'Jueves',
      horaInicio: 14
    });
    expect(component.exito()).toBeTrue();
    expect(component.error()).toBe('');
  });

  it('asignar() debería mostrar el mensaje de la regla incumplida cuando el servicio rechaza la sesión', async () => {
    component.grupoId = 1;
    horarioStub.asignarSesion.and.resolveTo('El grupo 1 ya tiene las 2 sesiones semanales de su curso');

    await component.asignar();

    expect(component.exito()).toBeFalse();
    expect(component.error()).toContain('ya tiene las 2 sesiones semanales');
  });

  it('limpiar() y verHorario() deberían restablecer el formulario y navegar a /horario', () => {
    spyOn(router, 'navigate');
    component.grupoId = 1;
    component.error.set('Error previo');

    component.limpiar();
    expect(component.grupoId).toBeNull();
    expect(component.dia).toBe('Lunes');
    expect(component.horaInicio).toBe(8);
    expect(component.error()).toBe('');

    component.verHorario();
    expect(router.navigate).toHaveBeenCalledWith(['/horario']);
  });
});
