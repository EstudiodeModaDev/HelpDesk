import "@supabase/functions-js/edge-runtime.d.ts";

type GraphTokenResponse = { access_token?: string };
type GraphUser = { id?: string };
type ShiftItem = { startDateTime?: string; endDateTime?: string };
type TeamsShift = {
  id: string;
  userId?: string;
  sharedShift?: ShiftItem | null;
  draftShift?: ShiftItem | null;
};
type GraphCollection<T> = { value?: T[]; "@odata.nextLink"?: string };

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseDate(value: unknown, name: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must have the YYYY-MM-DD format.`);
  }

  return value;
}

function escapeODataValue(value: string): string {
  return value.replaceAll("'", "''");
}

async function getGraphToken(): Promise<string> {
  const tenantId = getRequiredEnv("AZURE_TENANT_ID");
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("TEAMS_GRAPH_CLIENT_ID"),
      client_secret: getRequiredEnv("TEAMS_GRAPH_CLIENT_SECRET"),
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to obtain Microsoft Graph token: ${await response.text()}`);
  }

  const payload = await response.json() as GraphTokenResponse;
  if (!payload.access_token) throw new Error("Microsoft Graph did not return an access token.");
  return payload.access_token;
}

async function graphGet<T>(token: string, pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `https://graph.microsoft.com/v1.0${pathOrUrl}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!response.ok) {
    throw new Error(`Microsoft Graph request failed (${response.status}): ${await response.text()}`);
  }

  return await response.json() as T;
}

function getShiftItem(shift: TeamsShift): ShiftItem | null {
  // Prefer the published shift; draft is used only when it has not been published yet.
  return shift.sharedShift ?? shift.draftShift ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const correo = typeof body.correo === "string" ? body.correo.trim() : "";
    if (!correo) throw new Error("correo is required.");

    const inicio = parseDate(body.inicio, "inicio");
    const fin = parseDate(body.fin, "fin");
    const rangeStart = new Date(`${inicio}T00:00:00`).getTime();
    const rangeEnd = new Date(`${fin}T23:59:59.999`).getTime();
    if (rangeEnd < rangeStart) throw new Error("fin must be after inicio.");

    const token = await getGraphToken();
    const escapedCorreo = escapeODataValue(correo);
    const userFilter = encodeURIComponent(
      `mail eq '${escapedCorreo}' or userPrincipalName eq '${escapedCorreo}'`,
    );
    const users = await graphGet<GraphCollection<GraphUser>>(
      token,
      `/users?$filter=${userFilter}&$select=id&$top=2`,
    );
    const user = users.value?.[0];
    if (!user?.id) throw new Error(`No Microsoft Entra user was found for ${correo}.`);

    const teamId = getRequiredEnv("TEAMS_SCHEDULE_TEAM_ID");
    let page = await graphGet<GraphCollection<TeamsShift>>(
      token,
      `/teams/${encodeURIComponent(teamId)}/schedule/shifts`,
    );
    const shifts = [...(page.value ?? [])];

    while (page["@odata.nextLink"]) {
      page = await graphGet<GraphCollection<TeamsShift>>(token, page["@odata.nextLink"]);
      shifts.push(...(page.value ?? []));
    }

    const turnos = shifts.filter((shift) => shift.userId === user.id).flatMap((shift) => {
      const item = getShiftItem(shift);
      const start = new Date(item?.startDateTime ?? "").getTime();
      const end = new Date(item?.endDateTime ?? "").getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= rangeStart || start >= rangeEnd) return [];

      const clippedStart = Math.max(start, rangeStart);
      const clippedEnd = Math.min(end, rangeEnd);
      return [{
        id: shift.id,
        inicio: new Date(clippedStart).toISOString(),
        fin: new Date(clippedEnd).toISOString(),
        minutos: Math.round((clippedEnd - clippedStart) / 60000),
      }];
    });

    const minutosProgramados = turnos.reduce((total, turno) => total + turno.minutos, 0);
    return Response.json({ ok: true, minutosProgramados, turnos }, { headers: corsHeaders });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("obtener-disponibilidad-teams failed", { error: reason });
    return Response.json({ ok: false, error: reason }, { status: 500, headers: corsHeaders });
  }
});
