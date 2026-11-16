import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { UsuariosComponent } from './usuarios.component';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { UsuarioDTO } from '../models/usuario.dto';

/**
 * Suite de pruebas unitarias para {@link UsuariosComponent}.
 *
 * Verifica la creación, edición y eliminación de usuarios, así como la
 * protección para impedir cambiar el rol de la cuenta actualmente autenticada.
 */
describe('UsuariosComponent', () => {
  let component: UsuariosComponent;
  let fixture: ComponentFixture<UsuariosComponent>;
  let usuarioStub: Partial<UsuarioService> & {
    cargar: jasmine.Spy;
    crear: jasmine.Spy;
    actualizar: jasmine.Spy;
    eliminar: jasmine.Spy;
  };

  const usuarioDemo: UsuarioDTO = {
    id: 1,
    nombre: 'Gestor Inicial',
    correo: 'gestor@unbosque.edu.co',
    username: 'gestor',
    rol: 'GESTOR'
  };

  beforeEach(async () => {
    const authStub: Partial<AuthService> = {
      usuario: signal('gestor'),
      esGestor: signal(true)
    };

    usuarioStub = {
      usuarios: signal([usuarioDemo]),
      cargando: signal(false),
      errorApi: signal(''),
      cargar: jasmine.createSpy('cargar'),
      crear: jasmine.createSpy('crear').and.resolveTo(null),
      actualizar: jasmine.createSpy('actualizar').and.resolveTo(null),
      eliminar: jasmine.createSpy('eliminar').and.resolveTo(null)
    };

    await TestBed.configureTestingModule({
      declarations: [UsuariosComponent],
      imports: [FormsModule],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: UsuarioService, useValue: usuarioStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
    expect(component.usuarios().length).toBe(1);
  });

  it('editandoMiCuenta debería ser true cuando se edita el mismo usuario autenticado', () => {
    expect(component.editandoMiCuenta).toBeFalse();

    component.editar(usuarioDemo);
    expect(component.editandoMiCuenta).toBeTrue();
  });

  it('guardar() debería llamar a crear cuando editandoId es null y a actualizar cuando se edita un usuario', async () => {
    component.nombre = 'Consulta Prueba';
    component.correo = 'consulta@unbosque.edu.co';
    component.username = 'consulta1';
    component.password = 'ClaveSegura123';
    component.rol = 'CONSULTANTE';

    await component.guardar();
    expect(usuarioStub.crear).toHaveBeenCalledTimes(1);
    expect(component.exito()).toBe('Usuario creado correctamente.');

    component.editar(usuarioDemo);
    component.nombre = 'Gestor Modificado';
    await component.guardar();
    expect(usuarioStub.actualizar).toHaveBeenCalledTimes(1);
    expect(component.exito()).toBe('Usuario actualizado correctamente.');
  });

  it('eliminar() debería invocar UsuarioService.eliminar con el id indicado', async () => {
    await component.eliminar(2);
    expect(usuarioStub.eliminar).toHaveBeenCalledWith(2);
  });
});
