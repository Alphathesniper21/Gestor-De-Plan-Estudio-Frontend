import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { ParametrosComponent } from './parametros.component';
import { ParametroService } from '../services/parametro.service';
import { HorarioService } from '../services/horario.service';

/**
 * Suite de pruebas unitarias para {@link ParametrosComponent}.
 *
 * Verifica la visualización de los parámetros del horario con sus metadatos,
 * el control de borradores modificados y el guardado individual de cada regla
 * (CU06, RF-9, RNF-3).
 */
describe('ParametrosComponent', () => {
  let component: ParametrosComponent;
  let fixture: ComponentFixture<ParametrosComponent>;
  let parametroStub: Partial<ParametroService> & {
    cargar: jasmine.Spy;
    actualizar: jasmine.Spy;
  };

  beforeEach(async () => {
    parametroStub = {
      parametros: signal([
        { clave: 'cupo.base', valor: '40' },
        { clave: 'cupo.tolerancia', valor: '0.10' }
      ]),
      cupoMaximo: signal(44),
      cargando: signal(false),
      errorApi: signal(''),
      cargar: jasmine.createSpy('cargar'),
      actualizar: jasmine.createSpy('actualizar').and.resolveTo(null)
    };

    const horarioStub: Partial<HorarioService> = {
      clasesFueraDeHorario: signal([])
    };

    await TestBed.configureTestingModule({
      declarations: [ParametrosComponent],
      imports: [FormsModule, RouterModule.forRoot([])],
      providers: [
        { provide: ParametroService, useValue: parametroStub },
        { provide: HorarioService, useValue: horarioStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ParametrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente y construir las filas con sus metadatos', () => {
    expect(component).toBeTruthy();
    expect(component.filas().length).toBe(2);
    expect(component.filas()[0].meta.etiqueta).toBe('Cupo base por grupo');
  });

  it('cambiar() y modificado() deberían detectar cuándo un parámetro tiene un valor pendiente por guardar', () => {
    const fila = component.filas()[0];
    expect(component.modificado(fila)).toBeFalse();

    component.cambiar('cupo.base', '30');
    expect(component.valorDe(fila)).toBe('30');
    expect(component.modificado(fila)).toBeTrue();
  });

  it('guardar() debería invocar ParametroService.actualizar y limpiar el borrador si tiene éxito', async () => {
    const fila = component.filas()[0];
    component.cambiar('cupo.base', '30');

    await component.guardar(fila);

    expect(parametroStub.actualizar).toHaveBeenCalledWith('cupo.base', '30');
    expect(component.exito()).toContain('Cupo base por grupo actualizado correctamente.');
    expect(component.modificado(fila)).toBeFalse();
  });
});
