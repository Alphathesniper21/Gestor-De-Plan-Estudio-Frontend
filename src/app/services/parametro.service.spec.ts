import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CLAVES, ParametroService } from './parametro.service';
import { environment } from '../../environments/environment';

/**
 * Suite de pruebas unitarias para {@link ParametroService}.
 *
 * Verifica la carga y actualización de los parámetros configurables del
 * horario (CU06, RF-9, RNF-3) y el cálculo reactivo del cupo máximo
 * (`cupo.base * (1 + cupo.tolerancia)`, RF-2).
 */
describe('ParametroService', () => {
  let service: ParametroService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ParametroService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ParametroService);
    httpMock = TestBed.inject(HttpTestingController);

    // Resuelve la petición GET inicial disparada en el constructor
    const reqInicial = httpMock.expectOne(`${environment.apiUrl}/parametro/mostrartodo`);
    reqInicial.flush([
      { clave: CLAVES.cupoBase, valor: '40' },
      { clave: CLAVES.cupoTolerancia, valor: '0.10' },
      { clave: CLAVES.horaInicioJornada, valor: '07:00' },
      { clave: CLAVES.horaFinSemana, valor: '22:00' },
      { clave: CLAVES.horaFinSabado, valor: '13:00' },
      { clave: CLAVES.pausaInicio, valor: '12:00' },
      { clave: CLAVES.pausaFin, valor: '13:00' },
      { clave: CLAVES.sesionesMaximas, valor: '4' }
    ]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente con los valores predeterminados institucionales', () => {
    expect(service).toBeTruthy();
    expect(service.cupoMaximo()).toBe(44);
    expect(service.reglas().inicioJornada).toBe(420); // 07:00 = 420 min
    expect(service.reglas().finSemana).toBe(1320); // 22:00 = 1320 min
    expect(service.reglas().sesionesMaximas).toBe(4);
  });

  it('debería recalcular cupoMaximo en 33 cuando cupo.base cambia a 30 (Criterio de aceptación RF-9)', () => {
    service.parametros.set([
      { clave: CLAVES.cupoBase, valor: '30' },
      { clave: CLAVES.cupoTolerancia, valor: '0.10' }
    ]);

    expect(service.cupoMaximo()).toBe(33);
  });

  it('actualizar() debería rechazar un valor vacío sin llamar al servidor', async () => {
    const resultado = await service.actualizar(CLAVES.cupoBase, '   ');

    expect(resultado).toBe('El valor no puede estar vacío.');
  });

  it('actualizar() debería enviar PUT a /parametro/actualizar y recargar los parámetros', async () => {
    const promesa = service.actualizar(CLAVES.cupoBase, '30');

    const reqPut = httpMock.expectOne(`${environment.apiUrl}/parametro/actualizar`);
    expect(reqPut.request.method).toBe('PUT');
    expect(reqPut.request.body.get('clave')).toBe(CLAVES.cupoBase);
    expect(reqPut.request.body.get('valor')).toBe('30');
    reqPut.flush('Parametro actualizado exitosamente');

    const resultado = await promesa;

    const reqRecarga = httpMock.expectOne(`${environment.apiUrl}/parametro/mostrartodo`);
    reqRecarga.flush([
      { clave: CLAVES.cupoBase, valor: '30' },
      { clave: CLAVES.cupoTolerancia, valor: '0.10' }
    ]);

    expect(resultado).toBeNull();
    expect(service.cupoMaximo()).toBe(33);
  });
});
