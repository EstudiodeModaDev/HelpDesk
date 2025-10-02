import holidaysColombia from "festivos-colombianos";

export async function fetchHolidays(): Promise<string[]> {
  const year = new Date().getFullYear(); //Obtener el año actual
  const holidays = holidaysColombia(year);
  return holidays.map((h: any) => h.holidays); // array ["2025-01-01", "2025-05-01", ...]
}
