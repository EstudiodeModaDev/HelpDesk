export function parseFecha(fecha?: string): Date {
  if (!fecha) {return new Date(NaN) ; console.log("Fecha undefined");}
  const [dmy, hm] = fecha.trim().split(/\s+/);
  if (!dmy || !hm) return new Date(NaN);
  const [dia, mes, anio] = dmy.split('/');
  const [horas, minutos] = hm.split(':');
  if (!dia || !mes || !anio || !horas || !minutos) return new Date(NaN);
  const iso = `${anio}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}T${horas.padStart(2,'0')}:${minutos.padStart(2,'0')}`;
  const dt = new Date(iso);
  console.log("Original:", {fecha}, "ISO:", {iso}, "Date:", dt);
  return isNaN(dt.getTime()) ? new Date(NaN) : dt;
}

/** Devuelve YYYY-MM-DD aceptando Date o "dd/mm/yyyy hh:mm". Vacío si inválido. */
export function toISODateFlex(v?: Date | string): string {
  const d = v instanceof Date ? v : parseFecha(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
