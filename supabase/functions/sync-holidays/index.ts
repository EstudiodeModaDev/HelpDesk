import "@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";

import { loadConfig } from "./config.ts";

type HolidayApiRow = {
  date: string;
  day_of_week_es: string;
  name_es: string;
};

type HolidayRow = {
  fecha_festivo: string;
  dia_semana: string;
  nombre_festivo: string;
  source_year: number;
};

type HolidayApiResponse = {
  data?: HolidayApiRow[];
};

function resolveYear(request: Request): number {
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year")?.trim();

  if (!yearParam) {
    return new Date().getUTCFullYear();
  }

  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error(`Invalid year: ${yearParam}`);
  }

  return year;
}

async function fetchHolidays(year: number, apiUrl: string, apiKey: string): Promise<HolidayRow[]> {
  const response = await fetch(`${apiUrl}?year=${year}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Holiday API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as HolidayApiResponse;
  const rows = Array.isArray(payload.data) ? payload.data : [];

  return rows
    .filter((row) => row.date && row.day_of_week_es && row.name_es)
    .map((row) => ({
      fecha_festivo: row.date,
      dia_semana: row.day_of_week_es,
      nombre_festivo: row.name_es,
      source_year: year,
    }));
}

async function replaceHolidays(rows: HolidayRow[]) {
  const config = loadConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const dbRows = rows.map((row) => ({
    fecha_festivo: row.fecha_festivo,
    dia_semana: row.dia_semana,
    nombre_festivo: row.nombre_festivo,
    source_year: row.source_year,
  }));

  const { error: deleteError } = await supabase
    .from(config.tableName)
    .delete()
    .gte("source_year", 0);

  if (deleteError) {
    throw new Error(`Failed to clear table ${config.tableName}: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from(config.tableName)
    .insert(dbRows);

  if (insertError) {
    throw new Error(`Failed to insert holidays into ${config.tableName}: ${insertError.message}`);
  }

  return dbRows.length;
}

Deno.serve(async (request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 },
    );
  }

  try {
    const config = loadConfig();
    const year = resolveYear(request);
    const rows = await fetchHolidays(year, config.apiUrl, config.apiKey);

    if (rows.length === 0) {
      return Response.json(
        {
          ok: false,
          year,
          fetched: 0,
          inserted: 0,
          message: "The API returned no holidays. Existing records were not modified.",
        },
        { status: 422 },
      );
    }

    const inserted = await replaceHolidays(rows);

    return Response.json({
      ok: true,
      year,
      fetched: rows.length,
      inserted,
      message: "Holidays synchronized successfully.",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("sync-holidays execution failed", { error: reason });

    return Response.json(
      {
        ok: false,
        error: reason,
      },
      { status: 500 },
    );
  }
});
