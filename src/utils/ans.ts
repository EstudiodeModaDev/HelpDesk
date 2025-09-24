// src/utils/ans.ts
import { addMinutes, isSaturday, isSunday } from "date-fns";
import { TZDate } from "@date-fns/tz";

const TIMEZONE = "America/Bogota";
const WORK_START = 7;  // 7:00 am
const WORK_END = 17;   // 5:00 pm

function isHoliday(date: TZDate, holidays: string[]): boolean {
  const ymd = date.toISOString().slice(0, 10);
  return holidays.includes(ymd);
}

/**
 * Calcula fecha de solución respetando días hábiles 7am–5pm y festivos.
 * Devuelve una TZDate (hora local de Bogotá).
 */
export function calcularFechaSolucion(
  apertura: Date,
  horasAns: number,
  holidays: string[]
): TZDate {
  let restante = horasAns * 60; // minutos
  let actual = new TZDate(apertura, TIMEZONE); // trabajar siempre en Bogotá

  while (restante > 0) {
    let hora = actual.getHours();

    // Si es fin de semana o festivo → saltar al próximo día hábil 7am
    if (isSaturday(actual) || isSunday(actual) || isHoliday(actual, holidays)) {
      actual = new TZDate(
        new TZDate(
          actual.getFullYear(),
          actual.getMonth(),
          actual.getDate() + 1,
          WORK_START,
          0,
          0,
          TIMEZONE
        ),
        TIMEZONE
      );
      continue;
    }

    // Antes de 7am → saltar a 7am
    if (hora < WORK_START) {
      actual = new TZDate(
        actual.getFullYear(),
        actual.getMonth(),
        actual.getDate(),
        WORK_START,
        0,
        0,
        TIMEZONE
      );
      continue;
    }

    // Después de 5pm → saltar al siguiente día 7am
    if (hora >= WORK_END) {
      actual = new TZDate(
        actual.getFullYear(),
        actual.getMonth(),
        actual.getDate() + 1,
        WORK_START,
        0,
        0,
        TIMEZONE
      );
      continue;
    }

    // Minutos disponibles hasta fin de jornada
    const minutosHastaFin =
      (WORK_END - hora) * 60 - actual.getMinutes();
    const aConsumir = Math.min(restante, minutosHastaFin);

    actual = new TZDate(addMinutes(actual, aConsumir), TIMEZONE);
    restante -= aConsumir;

    // Si aún queda, mover a siguiente día 7am
    if (restante > 0) {
      actual = new TZDate(
        actual.getFullYear(),
        actual.getMonth(),
        actual.getDate() + 1,
        WORK_START,
        0,
        0,
        TIMEZONE
      );
    }
  }

  return actual;
}
