import { HttpParameterCodec, HttpParams } from '@angular/common/http';

/**
 * Codifica con encodeURIComponent. El codec por defecto de Angular deja sin
 * codificar caracteres como = ; @ : $ , / ?, que pueden aparecer en una
 * contraseña y confundir al parser del back.
 */
class CodificadorEstricto implements HttpParameterCodec {
  encodeKey(clave: string): string {
    return encodeURIComponent(clave);
  }
  encodeValue(valor: string): string {
    return encodeURIComponent(valor);
  }
  decodeKey(clave: string): string {
    return decodeURIComponent(clave);
  }
  decodeValue(valor: string): string {
    return decodeURIComponent(valor);
  }
}

export type DatosForm = Record<string, string | number | boolean | null | undefined>;

/**
 * Arma los datos como application/x-www-form-urlencoded. Se envía en el body
 * (no en la URL) y el back los sigue leyendo con @RequestParam. Los valores
 * null o undefined se omiten (p. ej. una contraseña opcional).
 */
export function formulario(datos: DatosForm): HttpParams {
  let params = new HttpParams({ encoder: new CodificadorEstricto() });
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== null && valor !== undefined) params = params.set(clave, String(valor));
  }
  return params;
}
