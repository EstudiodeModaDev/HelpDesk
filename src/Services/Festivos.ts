import holidaysColombia from "festivos-colombianos";

export async function fetchHolidays(): Promise<string[]> {
  const year = new Date().getFullYear(); //Obtener el año actual
  const holidays = holidaysColombia(year);
  const arrayFormated= holidays.map((h: any) => h.holidays); 
  console.log(arrayFormated)
  return arrayFormated
}
