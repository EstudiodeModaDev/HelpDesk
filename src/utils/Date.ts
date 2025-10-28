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

function pad(n: number) { return String(n).padStart(2, '0'); }

export function parseDateFlex(v?: string | Date | null): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const s = String(v).trim();
  if (!s) return null;

  // 1) Intento directo (ISO u otros)
  const attempt = new Date(s);
  if (!Number.isNaN(attempt.getTime())) return attempt;

  // 2) dd/mm/yyyy [hh[:mm]]
  const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?)?$/.exec(s);
  if (m) {
    const [, dd, mm, yy, hh = '0', mi = '0'] = m;
    const year = yy.length === 2 ? Number(`20${yy}`) : Number(yy);
    const month = Number(mm) - 1;
    const day = Number(dd);
    const hour = Number(hh);
    const min = Number(mi);
    const d = new Date(year, month, day, hour, min, 0);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day
    ) return d;
  }

  return null;
}

/** Formatea a "YYYY-MM-DD HH:mm" si es válida; si no, "" */
export function toISODateTimeFlex(v?: string | Date | null): string {
  const d = parseDateFlex(v);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Alternativa en formato local "DD/MM/YYYY HH:mm" */
export function toCoDateTimeFlex(v?: string | Date | null): string {
  const d = parseDateFlex(v);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toGraphDateTime(
  v: Date | { toISOString: () => string } | string | null | undefined
): string | undefined {
  if (!v) return undefined;

  // Si ya viene string ISO/fecha válida, respétalo
  if (typeof v === "string") {
    // "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss(.sss)Z"
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v)) return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  // TZDate, Date u objeto con toISOString()
  try {
    const iso = (v as any).toISOString?.();
    if (typeof iso === "string" && iso) return iso;
  } catch {}

  const d = new Date(v as any);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function toUtcIso(d?: Date | null): string | null {
  if (!d || isNaN(d.getTime())) return null;
  // toISOString() SIEMPRE retorna UTC con sufijo 'Z'
  return d.toISOString();
}

export function toGraphDateOnly(
  v: Date | { toISOString: () => string } | string | null | undefined,
  opts: { base?: "local" | "utc" } = { base: "local" }
): string | undefined {
  if (!v) return undefined;

  if (typeof v === "string") {
    // "YYYY-MM-DD" → déjalo igual
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // ISO con hora → devuelve solo la parte de fecha (UTC)
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    // Cualquier otra cosa parseable
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return undefined;
    // Decide si tomar local o UTC
    return opts.base === "utc"
      ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
          .toISOString()
          .slice(0, 10)
      : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  // Objetos con toISOString() o Date
  try {
    const iso = (v as any).toISOString?.();
    if (typeof iso === "string" && iso) return iso.slice(0, 10); // fecha desde UTC
  } catch {}

  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) return undefined;
  return opts.base === "utc"
    ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toISOString()
        .slice(0, 10)
    : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function toDate(d: string | Date){(d instanceof Date ? d : new Date(d))};
