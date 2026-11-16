import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { GruposComponent } from './grupos.component';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { GrupoDTO } from '../models/grupo.dto';

/**
 * Suite de pruebas unitarias para {@link GruposComponent}.
 *
 * Verifica la gestión de grupos por materia (CU03, RF-2): filtrado por nombre
 * de materia, creación, edición de número de grupo y cupo planeado, y
 * eliminación.
 */
describe('GruposComponent', () => {
  let component: GruposComponent;
  let fixture: ComponentFixture<GruposComponent>;
  let horarioStub: Partial<HorarioService> & {
    cargar: jasmine.Spy;
    crearGrupo: jasmine.Spy;
    actualizarGrupo: jasmine.Spy;
    eliminarGrupo: jasmine.Spy;
  };

  const grupoDemo: GrupoDTO = {
    id: 1,
    materiaId: 101,
    numeroGrupo: 1,
    cupoPlaneado: 40
  };

  beforeEach(async () => {
    const authStub: Partial<AuthService> = {
      esGestor: signal(true)
    };

    horarioStub = {
      materias: signal([
        { id: 101, codigo: 1001, nombre: 'Estructuras de Datos', semestre: 4, ncreditos: 3, horasDeLaMateria: 4, correlativa: false }
      ]),
      filasGrupos: signal([
        { grupo: grupoDemo, materia: 'Estructuras de Datos', sesiones: 1, maxSesiones: 2 }
      ]),
      cupoMaximo: signal(44),
      cargando: signal(false),
      cargar: jasmine.createSpy('cargar'),
      crearGrupo: jasmine.createSpy('crearGrupo').and.resolveTo(null),
      actualizarGrupo: jasmine.createSpy('actualizarGrupo').and.resolveTo(null),
      eliminarGrupo: jasmine.createSpy('eliminarGrupo').and.resolveTo(null)
    };

    await TestBed.configureTestingModule({
      declarations: [GruposComponent],
      imports: [FormsModule],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: HorarioService, useValue: horarioStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente y listar las filas de grupos', () => {
    expect(component).toBeTruthy();
    expect(component.visibles().length).toBe(1);
    expect(component.cupoMaximo()).toBe(44);
  });

  it('guardar() debería invocar crearGrupo al registrar un grupo nuevo y actualizarGrupo al editar', async () => {
    component.materiaId = 101;
    component.numeroGrupo = 2;
    component.cupoPlaneado = 35;

    await component.guardar();
    expect(horarioStub.crearGrupo).toHaveBeenCalledWith(101, 2, 35);
    expect(component.exito()).toBe('Grupo creado correctamente.');

    component.editar(grupoDemo);
    component.cupoPlaneado = 42;
    await component.guardar();
    expect(horarioStub.actualizarGrupo).toHaveBeenCalledWith(1, 1, 42);
    expect(component.exito()).toBe('Grupo actualizado correctamente.');
  });

  it('eliminar() debería invocar eliminarGrupo con el identificador correspondiente', async () => {
    await component.eliminar(1);
    expect(horarioStub.eliminarGrupo).toHaveBeenCalledWith(1);
  });
});
