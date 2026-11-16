import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PublicacionService } from './publicacion.service';
import { HorarioService } from './horario.service';
import { ParametroService } from './parametro.service';
import { environment } from '../../environments/environment';

/**
 * Suite de pruebas unitarias para {@link PublicacionService}.
 *
 * Verifica la consulta de grupos con sesiones pendientes (RF-11), la consulta
 * del estado de publicación y la acción de publicar el horario (CU08, RF-12).
 */
describe('PublicacionService', () => {
  let service: PublicacionService;
  let horarioService: HorarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PublicacionService,
        HorarioService,
        ParametroService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PublicacionService);
    horarioService = TestBed.inject(HorarioService);
    httpMock = TestBed.inject(HttpTestingController);

    // Resuelve las peticiones iniciales de HorarioService y ParametroService
    httpMock.match(() => true).forEach(req => req.flush([]));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('cargar() debería consultar /horario/pendientes y /horario/estado (RF-11 y RF-12)', () => {
    horarioService.materias.set([
      { id: 101, codigo: 1001, nombre: 'Estructuras de Datos', semestre: 4, ncreditos: 3, horasDeLaMateria: 4, correlativa: false }
    ]);
    horarioService.grupos.set([
      { id: 1, materiaId: 101, numeroGrupo: 1, cupoPlaneado: 40 }
    ]);

    service.cargar();

    const reqPendientes = httpMock.expectOne(`${environment.apiUrl}/horario/pendientes`);
    expect(reqPendientes.request.method).toBe('GET');
    reqPendientes.flush([{ id: 1, materiaId: 101, numeroGrupo: 1, cupoPlaneado: 40 }]);

    const reqEstado = httpMock.expectOne(`${environment.apiUrl}/horario/estado`);
    expect(reqEstado.request.method).toBe('GET');
    reqEstado.flush(false);

    expect(service.pendientes().length).toBe(1);
    expect(service.pendientes()[0].materia).toBe('Estructuras de Datos');
    expect(service.publicado()).toBeFalse();
  });

  it('publicar() debería impedir la publicación si existen grupos pendientes o no hay sesiones', async () => {
    const errorSinSesiones = await service.publicar();
    expect(errorSinSesiones).toBe('No se puede publicar un horario sin sesiones.');
  });

  it('publicar() debería hacer POST a /horario/publicar cuando todos los grupos están completos y en horario', async () => {
    horarioService.materias.set([
      { id: 101, codigo: 1001, nombre: 'Estructuras de Datos', semestre: 4, ncreditos: 3, horasDeLaMateria: 2, correlativa: false }
    ]);
    horarioService.grupos.set([
      { id: 1, materiaId: 101, numeroGrupo: 1, cupoPlaneado: 40 }
    ]);

    // Cargamos 1 sesión válida en HorarioService
    horarioService.cargar();
    httpMock.expectOne(`${environment.apiUrl}/materia/mostrartodo`).flush(horarioService.materias());
    httpMock.expectOne(`${environment.apiUrl}/grupo/mostrartodo`).flush(horarioService.grupos());
    httpMock.expectOne(`${environment.apiUrl}/sesion/mostrartodo`).flush([
      { id: 10, grupoId: 1, diaSemana: 1, horaInicio: '07:00:00', horaFin: '09:00:00' }
    ]);

    const promesa = service.publicar();

    const reqPost = httpMock.expectOne(`${environment.apiUrl}/horario/publicar`);
    expect(reqPost.request.method).toBe('POST');
    reqPost.flush('Horario publicado exitosamente');

    const resultado = await promesa;

    // Al publicar recarga pendientes y estado
    httpMock.expectOne(`${environment.apiUrl}/horario/pendientes`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/horario/estado`).flush(true);

    expect(resultado).toBeNull();
    expect(service.publicado()).toBeTrue();
  });
});
