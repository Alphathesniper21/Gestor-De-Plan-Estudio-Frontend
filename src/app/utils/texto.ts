/** Minúsculas y sin tildes, para comparar textos en los filtros. */
export function normalizar(texto: string | number | null | undefined): string {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
