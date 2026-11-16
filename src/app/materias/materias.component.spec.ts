import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { MateriasComponent } from './materias.component';
import { AuthService } from '../services/auth.service';
import { HorarioService } from '../services/horario.service';
import { MateriaDTO } from '../models/materia.dto';

/**
 * Suite de pruebas unitarias para {@link MateriasComponent}.
 *
 * Verifica la gestión del catálogo de materias (CU02, RF-1): búsqueda por
 * nombre o código, preparación de edición, creación, actualización y
 * eliminación.
 */
describe('MateriasComponent', () => {
  let component: MateriasComponent;
  let fixture: ComponentFixture<MateriasComponent>;
  let horarioStub: Partial<HorarioService> & {
    cargar: jasmine.Spy;
    crearMateria: jasmine.Spy;
    actualizarMateria: jasmine.Spy;
    eliminarMateria: jasmine.Spy;
  };

  const materiaDemo: MateriaDTO = {
    id: 101,
    codigo: 1001,
    nombre: 'Programación I',
    semestre: 2,
    ncreditos: 3,
    horasDeLaMateria: 4,
    correlativa: false
  };

  beforeEach(async () => {
    const authStub: Partial<AuthService> = {
      esGestor: signal(true)
    };

    horarioStub = {
      materias: signal([materiaDemo]),
      cargando: signal(false),
      cargar: jasmine.createSpy('cargar'),
      crearMateria: jasmine.createSpy('crearMateria').and.resolveTo(null),
      actualizarMateria: jasmine.createSpy('actualizarMateria').and.resolveTo(null),
      eliminarMateria: jasmine.createSpy('eliminarMateria').and.resolveTo(null)
    };

    await TestBed.configureTestingModule({
      declarations: [MateriasComponent],
      imports: [FormsModule],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: HorarioService, useValue: horarioStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MateriasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente y mostrar las materias cargadas', () => {
    expect(component).toBeTruthy();
    expect(component.visibles().length).toBe(1);
  });

  it('visibles() debería filtrar ignorando tildes y mayúsculas', () => {
    component.filtro.set('programacion');
    expect(component.visibles().length).toBe(1);

    component.filtro.set('9999');
    expect(component.visibles().length).toBe(0);
  });

  it('editar() y cancelar() deberían cargar los datos en el formulario y luego restablecerlos', () => {
    component.editar(materiaDemo);
    expect(component.editandoId).toBe(101);
    expect(component.codigo).toBe(1001);
    expect(component.nombre).toBe('Programación I');

    component.cancelar();
    expect(component.editandoId).toBeNull();
    expect(component.nombre).toBe('');
  });

  it('guardar() debería llamar a crearMateria cuando editandoId es null y a actualizarMateria cuando tiene valor', async () => {
    component.codigo = 2002;
    component.nombre = 'Estructuras de Datos';
    component.semestre = 3;
    component.ncreditos = 3;
    component.horasDeLaMateria = 4;

    await component.guardar();
    expect(horarioStub.crearMateria).toHaveBeenCalledTimes(1);
    expect(component.exito()).toBeTrue();

    component.editar(materiaDemo);
    await component.guardar();
    expect(horarioStub.actualizarMateria).toHaveBeenCalledTimes(1);
  });

  it('eliminar() debería delegar en HorarioService.eliminarMateria', async () => {
    await component.eliminar(101);
    expect(horarioStub.eliminarMateria).toHaveBeenCalledWith(101);
  });
});
