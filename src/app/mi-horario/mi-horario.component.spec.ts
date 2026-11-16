import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { MiHorarioComponent } from './mi-horario.component';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { ClaseHorario, Dia } from '../models/horario.model';

/**
 * Suite de pruebas unitarias para {@link MiHorarioComponent}.
 *
 * Verifica la distribución visual de bloques en carriles cuando coinciden en
 * horario, la navegación a asignar sesión desde una celda vacía (RF-3) y las
 * operaciones de mover y eliminar una sesión desde el modal de detalle (RF-8).
 */
describe('MiHorarioComponent', () => {
  let component: MiHorarioComponent;
  let fixture: ComponentFixture<MiHorarioComponent>;
  let router: Router;
  let horarioStub: Partial<HorarioService> & {
    moverSesion: jasmine.Spy;
    eliminarSesion: jasmine.Spy;
  };

  const clase1: ClaseHorario = {
    id: 10,
    grupoId: 1,
    materiaId: 101,
    materia: 'Estructuras de Datos',
    grupo: '1',
    dia: 'Lunes',
    horaInicio: 8,
    horaFin: 10,
    color: '#f97316'
  };

  const clase2Solapada: ClaseHorario = {
    id: 11,
    grupoId: 2,
    materiaId: 102,
    materia: 'Bases de Datos',
    grupo: '2',
    dia: 'Lunes',
    horaInicio: 8,
    horaFin: 10,
    color: '#2563eb'
  };

  beforeEach(async () => {
    const authStub: Partial<AuthService> = {
      esGestor: signal(true)
    };

    horarioStub = {
      clases: signal([clase1, clase2Solapada]),
      clasesFueraDeHorario: signal<ClaseHorario[]>([]),
      dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as Dia[],
      horasGrilla: signal([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]),
      avisoSesiones: false,
      formatoHora: (h: number) => `${String(h).padStart(2, '0')}:00`,
      dentroDeHorario: () => true,
      horasValidas: () => [7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20],
      moverSesion: jasmine.createSpy('moverSesion').and.resolveTo(null),
      eliminarSesion: jasmine.createSpy('eliminarSesion').and.resolveTo(null)
    };

    await TestBed.configureTestingModule({
      declarations: [MiHorarioComponent],
      imports: [FormsModule, RouterModule.forRoot([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: HorarioService, useValue: horarioStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MiHorarioComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('debería crearse correctamente y repartir en 2 carriles las sesiones que coinciden a la misma hora', () => {
    expect(component).toBeTruthy();
    const bloques = component.bloques();
    expect(bloques.length).toBe(2);
    expect(bloques[0].carriles).toBe(2);
    expect(bloques[0].carril).toBe(0);
    expect(bloques[1].carril).toBe(1);
  });

  it('asignarEn() debería navegar a /horario/asignar con los queryParams de día y hora (RF-3)', () => {
    spyOn(router, 'navigate');

    component.asignarEn('Martes', 10);

    expect(router.navigate).toHaveBeenCalledWith(['/horario/asignar'], {
      queryParams: { dia: 'Martes', hora: 10 }
    });
  });

  it('guardarMovimiento() debería invocar moverSesion y conservar el modal con el error si la regla se incumple (RF-8)', async () => {
    component.seleccionada.set(clase1);
    component.iniciarMovimiento(clase1);
    component.nuevoDia = 'Miércoles';
    component.nuevaHora = 14;

    horarioStub.moverSesion.and.resolveTo('La sesion se cruza con otro curso');
    await component.guardarMovimiento(clase1);
    expect(component.errorMover()).toBe('La sesion se cruza con otro curso');
    expect(component.seleccionada()).not.toBeNull();

    horarioStub.moverSesion.and.resolveTo(null);
    await component.guardarMovimiento(clase1);
    expect(component.seleccionada()).toBeNull();
  });

  it('eliminar() debería invocar eliminarSesion y cerrar el modal (RF-8)', async () => {
    component.seleccionada.set(clase1);

    await component.eliminar(clase1);

    expect(horarioStub.eliminarSesion).toHaveBeenCalledWith(10);
    expect(component.seleccionada()).toBeNull();
  });
});
