import type { Ticket } from "../Models/Tickets";

export function parseFecha(fecha?: string): Date {
  if (!fecha) return new Date(NaN);

  // Espera "dd/mm/yyyy hh:mm" (permite espacios múltiples)
  const [dmy, hm] = fecha.trim().split(/\s+/);
  if (!dmy || !hm) return new Date(NaN);

  const [dia, mes, anio] = dmy.split('/');
  const [horas, minutos] = hm.split(':');
  if (!dia || !mes || !anio || !horas || !minutos) return new Date(NaN);

  // Construye ISO local (sin zona): yyyy-mm-ddThh:mm
  const iso = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`;

  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? new Date(NaN) : dt;
}

export function calcularColorEstado(ticket: Ticket): string {
  const estado = (ticket.estado ?? '').toLowerCase();

  if (estado === 'cerrado' || estado === 'cerrado fuera de tiempo') {
    return 'rgba(0,0,0,1)'; // negro
  }

  if (!ticket.FechaApertura || !ticket.TiempoSolucion) {
    return 'rgba(255,0,0,1)'; // rojo si faltan fechas
  }

  const inicio = parseFecha(ticket.FechaApertura).getTime();
  const fin    = parseFecha(ticket.TiempoSolucion).getTime();
  const ahora  = Date.now();

  if (isNaN(inicio) || isNaN(fin)) {
    return 'rgba(255,0,0,1)'; // rojo si fechas inválidas
  }

  const horasTotales    = (fin - inicio) / 3_600_000;
  const horasRestantes  = (fin - ahora)  / 3_600_000;

  // Vencido o duración inválida => rojo
  if (horasTotales <= 0 || horasRestantes <= 0) {
    return 'rgba(255,0,0,1)';
  }

  // p = % de tiempo restante (0 a 1)
  const p = Math.max(0, Math.min(1, horasRestantes / horasTotales));

  // Paleta simple: >50% -> verde oscuro, 10–50% -> amarillo, <10% -> rojo
  const r = p > 0.5 ? 34  : p > 0.1 ? 255 : 255;
  const g = p > 0.5 ? 139 : p > 0.1 ? 165 :   0;
  const b = p > 0.5 ? 34  : p > 0.1 ?   0 :   0;

  // Alpha más visible cuando queda poco tiempo
  const alpha = Math.max(0.3, 1 - p);

  return `rgba(${r},${g},${b},${alpha})`;
}
