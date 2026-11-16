import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HorarioService } from './horario.service';
import { ParametroService } from './parametro.service';
import { environment } from '../../environments/environment';
import { MateriaDTO } from '../models/materia.dto';
import { GrupoDTO } from '../models/grupo.dto';
import { SesionDTO } from '../models/sesion.dto';

/**
 * Suite de pruebas unitarias para {@link HorarioService}.
 *
 * Verifica las operaciones CRUD y validaciones de cliente para materias (RF-1),
 * grupos (RF-2) y sesiones (RF-3 a RF-8), así como el cálculo de franjas
 * válidas y la detección de sesiones fuera del horario configurado.
 */
describe('HorarioService', () => {
  let service: HorarioService;
  let httpMock: HttpTestingController;

  const mockMaterias: MateriaDTO[] = [
    {
      id: 101,
      codigo: 4001,
      nombre: 'Estructuras de Datos',
      semestre: 4,
      ncreditos: 3,
      horasDeLaMateria: 4,
      correlativa: false
    }
  ];

  const mockGrupos: GrupoDTO[] = [
    { id: 1, materiaId: 101, numeroGrupo: 1, cupoPlaneado: 40 }
  ];

  const mockSesiones: SesionDTO[] = [
    { id: 10, grupoId: 1, diaSemana: 1, horaInicio: '07:00:00', horaFin: '09:00:00' }
  ];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        HorarioService,
        ParametroService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(HorarioService);
    httpMock = TestBed.inject(HttpTestingController);

    // Resuelve las peticiones iniciales del constructor
    httpMock.expectOne(`${environment.apiUrl}/parametro/mostrartodo`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/materia/mostrartodo`).flush(mockMaterias);
    httpMock.expectOne(`${environment.apiUrl}/grupo/mostrartodo`).flush(mockGrupos);
    httpMock.expectOne(`${environment.apiUrl}/sesion/mostrartodo`).flush(mockSesiones);
    httpMock.expectOne(`${environment.apiUrl}/horario/estado`).flush(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debería crearse correctamente y calcular los totales iniciales', () => {
    expect(service).toBeTruthy();
    expect(service.totalMaterias()).toBe(1);
    expect(service.totalGrupos()).toBe(1);
    expect(service.totalSesiones()).toBe(1);
    expect(service.totalHoras()).toBe(2);
  });

  // ─── MATERIAS (RF-1) ──────────────────────────────────────────────────────

  it('crearMateria() debería validar semestre (1 a 9), horas pares y máximo de sesiones (RF-1)', async () => {
    const errSemestre = await service.crearMateria({
      codigo: 2001,
      nombre: 'Física',
      semestre: 10,
      ncreditos: 3,
      horasDeLaMateria: 4,
      correlativa: false
    });
    expect(errSemestre).toBe('El semestre debe estar entre 1 y 9.');

    const errImpar = await service.crearMateria({
      codigo: 2001,
      nombre: 'Física',
      semestre: 2,
      ncreditos: 3,
      horasDeLaMateria: 3,
      correlativa: false
    });
    expect(errImpar).toBe('Las horas deben ser pares: cada sesión dura 2 horas.');

    const errMaxSesiones = await service.crearMateria({
      codigo: 2001,
      nombre: 'Física',
      semestre: 2,
      ncreditos: 3,
      horasDeLaMateria: 10,
      correlativa: false
    });
    expect(errMaxSesiones).toContain('sesiones semanales y el máximo es 4');
  });

  it('crearMateria() debería hacer POST a /materia/crear cuando los datos son válidos', async () => {
    const promesa = service.crearMateria({
      codigo: 4002,
      nombre: 'Bases de Datos',
      semestre: 4,
      ncreditos: 3,
      horasDeLaMateria: 4,
      correlativa: true
    });

    const reqPost = httpMock.expectOne(`${environment.apiUrl}/materia/crear`);
    expect(reqPost.request.method).toBe('POST');
    expect(reqPost.request.body.get('codigo')).toBe('4002');
    reqPost.flush('Materia creada exitosamente');

    const resultado = await promesa;
    httpMock.expectOne(`${environment.apiUrl}/materia/mostrartodo`).flush(mockMaterias);

    expect(resultado).toBeNull();
  });

  it('eliminarMateria() debería impedir borrar una materia que tiene grupos asociados', async () => {
    const resultado = await service.eliminarMateria(101);
    expect(resultado).toBe('La materia tiene grupos asociados.');
  });

  // ─── GRUPOS (RF-2) ────────────────────────────────────────────────────────

  it('crearGrupo() debería rechazar un número de grupo duplicado para la misma materia', async () => {
    const resultado = await service.crearGrupo(101, 1, 35);
    expect(resultado).toBe('La materia ya tiene ese número de grupo.');
  });

  it('crearGrupo() debería hacer POST a /grupo/crear cuando los datos son válidos', async () => {
    const promesa = service.crearGrupo(101, 2, 44);

    const reqPost = httpMock.expectOne(`${environment.apiUrl}/grupo/crear`);
    expect(reqPost.request.method).toBe('POST');
    expect(reqPost.request.body.get('numeroGrupo')).toBe('2');
    expect(reqPost.request.body.get('cupoPlaneado')).toBe('44');
    reqPost.flush('Grupo creado exitosamente');

    const resultado = await promesa;
    httpMock.expectOne(`${environment.apiUrl}/grupo/mostrartodo`).flush(mockGrupos);

    expect(resultado).toBeNull();
  });

  // ─── SESIONES Y REGLAS DE HORARIO (RF-3 A RF-8) ───────────────────────────

  it('horasValidas() debería excluir la pausa del mediodía (11:00 y 12:00) y las horas tras el cierre sabatino (RF-4, RF-5)', () => {
    const validasLunes = service.horasValidas('Lunes');
    expect(validasLunes).toContain(7);
    expect(validasLunes).toContain(10); // 10:00 - 12:00 es válida
    expect(validasLunes).not.toContain(11); // 11:00 - 13:00 invade pausa
    expect(validasLunes).not.toContain(12); // 12:00 - 14:00 invade pausa
    expect(validasLunes).not.toContain(21); // 21:00 - 23:00 supera cierre 22:00

    const validasSabado = service.horasValidas('Sábado');
    expect(validasSabado).toContain(10); // 10:00 - 12:00
    expect(validasSabado).not.toContain(12); // 12:00 - 14:00 supera cierre 13:00
    expect(validasSabado).not.toContain(14);
  });

  it('asignarSesion() debería hacer POST a /sesion/crear con formato HH:mm', async () => {
    const promesa = service.asignarSesion({
      grupoId: 1,
      dia: 'Miércoles',
      horaInicio: 9
    });

    const reqPost = httpMock.expectOne(`${environment.apiUrl}/sesion/crear`);
    expect(reqPost.request.method).toBe('POST');
    expect(reqPost.request.body.get('grupoId')).toBe('1');
    expect(reqPost.request.body.get('diaSemana')).toBe('3');
    expect(reqPost.request.body.get('horaInicio')).toBe('09:00');
    expect(reqPost.request.body.get('horaFin')).toBe('11:00');
    reqPost.flush('Sesion creada exitosamente');

    const resultado = await promesa;
    httpMock.expectOne(`${environment.apiUrl}/sesion/mostrartodo`).flush(mockSesiones);

    expect(resultado).toBeNull();
  });

  it('moverSesion() y eliminarSesion() deberían invocar PUT /sesion/actualizar y DELETE /sesion/eliminar/{id} (RF-8)', async () => {
    const promesaMover = service.moverSesion(10, 'Jueves', 14);

    const reqPut = httpMock.expectOne(`${environment.apiUrl}/sesion/actualizar`);
    expect(reqPut.request.method).toBe('PUT');
    expect(reqPut.request.body.get('id')).toBe('10');
    expect(reqPut.request.body.get('diaSemana')).toBe('4');
    expect(reqPut.request.body.get('horaInicio')).toBe('14:00');
    reqPut.flush('Sesion actualizada exitosamente');

    expect(await promesaMover).toBeNull();
    httpMock.expectOne(`${environment.apiUrl}/sesion/mostrartodo`).flush(mockSesiones);

    const promesaEliminar = service.eliminarSesion(10);
    const reqDel = httpMock.expectOne(`${environment.apiUrl}/sesion/eliminar/10`);
    expect(reqDel.request.method).toBe('DELETE');
    reqDel.flush('Sesion eliminada exitosamente');

    expect(await promesaEliminar).toBeNull();
    expect(service.totalSesiones()).toBe(0);
  });

  it('filtrarPorSemestre() debería consultar GET /sesion/mostrarporsemestre/{semestre} y actualizar clasesPorSemestre (RF-10)', () => {
    service.filtrarPorSemestre(4);

    const req = httpMock.expectOne(`${environment.apiUrl}/sesion/mostrarporsemestre/4`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSesiones);

    expect(service.clasesPorSemestre().length).toBe(1);
    expect(service.clasesPorSemestre()[0].materia).toBe('Estructuras de Datos');

    service.filtrarPorSemestre(null);
    expect(service.clasesPorSemestre().length).toBe(1);
  });
});
