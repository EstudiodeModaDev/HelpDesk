// src/utils/Date.ts
/** Intenta parsear fechas en formatos comunes:
 *  - "dd/mm/yyyy hh:mm"
 *  - "dd/mm/yy hh:mm"
 *  - "dd/mm/yyyy"
 *  - ISO (new Date(...))
 *  - Date
 * Retorna "" si es inválida. Si es válida, "YYYY-MM-DD".
 */
export function toISODateFlex(v?: string | Date | null): string {
  if (v == null || v === '') return '';

  let d: Date | null = null;

  if (v instanceof Date) {
    d = v;
  } else {
    const s = String(v).trim();
    if (!s) return '';

    // 1) Intento directo (ISO u otros que JS entienda)
    const tryIso = new Date(s);
    if (!Number.isNaN(tryIso.getTime())) {
      d = tryIso;
    } else {
      // 2) dd/mm/yyyy [hh[:mm]]
      const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?)?$/.exec(s);
      if (m) {
        const [, dd, mm, yy, hh = '0', mi = '0'] = m;
        const year = yy.length === 2 ? Number(`20${yy}`) : Number(yy);
        const month = Number(mm) - 1;
        const day = Number(dd);
        const hour = Number(hh);
        const min = Number(mi);
        const candidate = new Date(year, month, day, hour, min, 0);
        // valida que coincida (p.ej. 32/13/2025 no pase)
        if (
          candidate.getFullYear() === year &&
          candidate.getMonth() === month &&
          candidate.getDate() === day
        ) {
          d = candidate;
        }
      }
    }
  }

  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
}
