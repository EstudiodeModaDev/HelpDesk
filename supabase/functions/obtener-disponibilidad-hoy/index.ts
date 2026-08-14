import "@supabase/functions-js/edge-runtime.d.ts";

type GraphTokenResponse = { access_token?: string };
type GraphUser = { id?: string; displayName?: string; mail?: string; userPrincipalName?: string };
type ShiftItem = { startDateTime?: string; endDateTime?: string };
type TeamsShift = {
  id: string;
  userId?: string;
  sharedShift?: ShiftItem | null;
  draftShift?: ShiftItem | null;
};
type GraphCollection<T> = { value?: T[]; "@odata.nextLink"?: string };

type TurnoHoy = {
  shiftId: string;
  userId: string;
  nombre: string | null;
  correo: string | null;
  inicio: string;
  fin: string;
  activoAhora: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getColombiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
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

async function fetchAllShifts(token: string, teamId: string): Promise<TeamsShift[]> {
  let page = await graphGet<GraphCollection<TeamsShift>>(
    token,
    `/teams/${encodeURIComponent(teamId)}/schedule/shifts`,
  );
  const shifts = [...(page.value ?? [])];

  while (page["@odata.nextLink"]) {
    page = await graphGet<GraphCollection<TeamsShift>>(token, page["@odata.nextLink"]);
    shifts.push(...(page.value ?? []));
  }

  return shifts;
}

async function resolveUsers(token: string, userIds: string[]): Promise<Map<string, GraphUser>> {
  const entries = await Promise.all(userIds.map(async (userId) => {
    const user = await graphGet<GraphUser>(
      token,
      `/users/${encodeURIComponent(userId)}?$select=id,displayName,mail,userPrincipalName`,
    );
    return [userId, user] as const;
  }));

  return new Map(entries);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const body = request.method === "POST"
      ? await request.json().catch(() => ({})) as Record<string, unknown>
      : {};
    const teamId = (typeof body.teamId === "string" && body.teamId.trim()) ||
      url.searchParams.get("teamId")?.trim() ||
      getRequiredEnv("TEAMS_SCHEDULE_TEAM_ID");

    const now = new Date();
    const fecha = getColombiaDateKey(now);
    const rangeStart = new Date(`${fecha}T00:00:00`).getTime();
    const rangeEnd = new Date(`${fecha}T23:59:59.999`).getTime();
    const nowMs = now.getTime();

    const token = await getGraphToken();
    const shifts = await fetchAllShifts(token, teamId);

    const turnosHoyRaw = shifts.flatMap((shift) => {
      if (!shift.userId) return [];
      const item = getShiftItem(shift);
      const start = new Date(item?.startDateTime ?? "").getTime();
      const end = new Date(item?.endDateTime ?? "").getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= rangeStart || start >= rangeEnd) return [];

      return [{
        shiftId: shift.id,
        userId: shift.userId,
        inicio: new Date(start).toISOString(),
        fin: new Date(end).toISOString(),
        activoAhora: nowMs >= start && nowMs <= end,
      }];
    }).sort((a, b) => a.inicio.localeCompare(b.inicio));

    const uniqueUserIds = [...new Set(turnosHoyRaw.map((turno) => turno.userId))];
    const users = uniqueUserIds.length > 0
      ? await resolveUsers(token, uniqueUserIds)
      : new Map<string, GraphUser>();

    const turnosHoy: TurnoHoy[] = turnosHoyRaw.map((turno) => {
      const user = users.get(turno.userId);
      return {
        ...turno,
        nombre: user?.displayName ?? null,
        correo: user?.mail ?? user?.userPrincipalName ?? null,
      };
    });

    const personaDisponibleAhora = turnosHoy.find((turno) => turno.activoAhora) ?? null;

    return Response.json({
      ok: true,
      fecha,
      ahora: now.toISOString(),
      turnosHoy,
      personaDisponibleAhora,
    }, { headers: corsHeaders });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("obtener-disponibilidad-hoy failed", { error: reason });
    return Response.json({ ok: false, error: reason }, { status: 500, headers: corsHeaders });
  }
});
