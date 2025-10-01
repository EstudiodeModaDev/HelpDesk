//Obtener los festivos desde la API pública
export async function fetchHolidays(country = "ES"): Promise<string[]> {
  const year = new Date().getFullYear(); //Obtener el año actual
  const url = `https://api.generadordni.es/v2/holidays/holidays?country=${country}&year=${year}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Error obteniendo festivos");
  const data = await res.json();

  // La API devuelve { date: "2025-01-01", localName: "..." } → normalizamos
  return data.map((h: any) => h.date); // array ["2025-01-01", "2025-05-01", ...]
}
