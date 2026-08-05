import type { Holiday } from "../Models/Holiday";
import { supabase } from "./Supabase.service";

type HolidayRow = {
  fecha_festivo: string;
  dia_semana: string;
  nombre_festivo: string;
  source_year: number;
};

export async function fetchHolidays(): Promise<Holiday[]> {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from("TBL_Festivos_Solvi")
    .select("fecha_festivo, dia_semana, nombre_festivo, source_year")
    .eq("source_year", year)
    .order("fecha_festivo", { ascending: true });

  if (error) {
    throw new Error(`Error loading holidays from Supabase: ${error.message}`);
  }

  return ((data ?? []) as HolidayRow[]).map((row) => ({
    date: row.fecha_festivo,
    day_of_week: row.dia_semana,
    festivo_name: row.nombre_festivo,
  }));
}
