// src/Hooks/useGroupMembers.ts
import * as React from "react";
import type { GraphListResponse, GraphUser } from "../../Models/GraphUsers"
import { useAuth } from "../../auth/authContext";
import { GraphRest, GraphError } from "../../graph/GraphRest";

/* ============================
   Detección de errores de membresía
   ============================ */
// Graph no expone un `error.code` propio para distinguir "ya es miembro" /
// "ya no es miembro" de un grupo: para el 404 de un $ref inexistente el
// status alcanza, pero para el 400 de "ya es miembro" hay que apoyarse en
// el texto del mensaje porque Graph no da nada mejor. Se deja centralizado
// aquí (en vez de repetido en cada función) para que, si Graph cambia la
// redacción, solo haya que tocar un lugar; mientras tanto el error se
// propaga visible en vez de fallar en silencio.
function isAlreadyMemberError(e: unknown): boolean {
  if (!(e instanceof GraphError)) return false;
  return (
    e.status === 400 &&
    /added object references already exist|ObjectReferencesAlreadyExist/i.test(e.message)
  );
}

function isNotAMemberError(e: unknown): boolean {
  if (!(e instanceof GraphError)) return false;
  if (e.status === 404) return true;
  return (
    e.status === 400 &&
    /ObjectReferencesDoNotExist|removed object references/i.test(e.message)
  );
}

/* ============================
   Endpoints específicos
   ============================ */

// === Listar miembros (transitivos o directos). Ojo: /transitiveMembers puede devolver grupos/devices
async function fetchGroupMembers(
  groupId: string,
  graph: GraphRest,
  transitive = true
): Promise<GraphUser[]> {
  const select = "id,displayName,mail,userPrincipalName,jobTitle";
  let path: string | undefined =
    `/groups/${groupId}/${transitive ? "transitiveMembers" : "members"}` +
    `?$select=${select}&$top=999`;

  const all: any[] = [];
  while (path) {
    const data: GraphListResponse<any> = await graph.get(path, {
      headers: { ConsistencyLevel: "eventual" },
    });
    all.push(...(data.value ?? []));
    const next: string | undefined = data["@odata.nextLink"];
    path = next ? next.replace("https://graph.microsoft.com/v1.0", "") : undefined;
  }

  // Filtrar solo usuarios (en transitive pueden venir grupos o devices)
  // Heurística: odata.type termina con "user" o tiene userPrincipalName
  const users = all.filter(
    (it) =>
      (typeof it?.["@odata.type"] === "string" &&
        it["@odata.type"].toLowerCase().endsWith("user")) ||
      !!it?.userPrincipalName
  );

  return users as GraphUser[];
}

// === Agregar miembro por userId
export async function addMemberByUserId(
  groupId: string,
  userId: string,
  graph: GraphRest
) {
  const path = `/groups/${groupId}/members/$ref`;
  const body = { "@odata.id": `https://graph.microsoft.com/v1.0/users/${userId}` };
  try {
    await graph.post(path, body);
    return { ok: true as const };
  } catch (e) {
    if (isAlreadyMemberError(e)) {
      return { ok: true as const, already: true as const };
    }
    throw e;
  }
}

// === Buscar userId por correo
export async function getUserIdByEmail(email: string, graph: GraphRest): Promise<string | null> {
  const q = email.replace(/'/g, "''");
  const path =
    `/users?$select=id,mail,userPrincipalName` +
    `&$filter=mail eq '${q}' or userPrincipalName eq '${q}'`;

  const data = await graph.get<GraphListResponse<any>>(path);
  const user = (data.value ?? [])[0];
  return user?.id ?? null;
}

// === Quitar miembro directo por userId
export async function removeMemberByUserId(
  groupId: string,
  userId: string,
  graph: GraphRest
): Promise<{ ok: true; already?: true }> {
  const path = `/groups/${groupId}/members/${userId}/$ref`;
  try {
    await graph.delete(path); // 204 No Content
    return { ok: true };
  } catch (e) {
    if (isNotAMemberError(e)) {
      return { ok: true, already: true };
    }
    throw e;
  }
}

// === Quitar miembro por email (resuelve userId primero)
export async function removeMemberByEmail(
  groupId: string,
  email: string,
  graph: GraphRest
): Promise<{ ok: true; already?: true }> {
  const userId = await getUserIdByEmail(email, graph);
  if (!userId) {
    // Usuario no existe en el tenant: trátalo como "ya no miembro directo"
    return { ok: true, already: true };
  }
  return removeMemberByUserId(groupId, userId, graph);
}

// === Bulk remove (útil para UX)
export async function removeMembersBulk(
  groupId: string,
  userIdsOrEmails: string[],
  graph: GraphRest
): Promise<{ removed: string[]; already: string[]; errors: { id: string; error: string }[] }> {
  const removed: string[] = [];
  const already: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const idOrEmail of userIdsOrEmails) {
    try {
      const looksLikeGuid = /^[0-9a-f-]{36}$/i.test(idOrEmail);
      const result = looksLikeGuid
        ? await removeMemberByUserId(groupId, idOrEmail, graph)
        : await removeMemberByEmail(groupId, idOrEmail, graph);

      if (result.already) already.push(idOrEmail);
      else removed.push(idOrEmail);
    } catch (e: any) {
      errors.push({ id: idOrEmail, error: String(e?.message ?? e) });
    }
  }

  return { removed, already, errors };
}

/* ============================
   Tipos de la app/UI
   ============================ */
export type AppUsers = {
  id: string;
  nombre: string;
  correo: string;
};

/* ============================
   Hook principal
   ============================ */
export function useGroupMembers(groupId: string) {
  const { getToken } = useAuth();
  const graph = React.useMemo(() => new GraphRest(getToken), [getToken]);

  const [rows, setRows] = React.useState<AppUsers[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // búsqueda/paginación en cliente
  const [search, setSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState(10);
  const [pageIndex, setPageIndex] = React.useState(0);

  // Cargar miembros
  const refresh = React.useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const users = await fetchGroupMembers(groupId, graph, true); // transitivos
      const mapped: AppUsers[] = users.map((u) => ({
        id: u.id,
        nombre: u.displayName ?? u.userPrincipalName ?? "(Sin nombre)",
        correo: u.mail ?? u.userPrincipalName ?? "",
      }));
      setRows(mapped);
      setPageIndex(0);
    } catch (e: any) {
      setError(e?.message ?? "Error al consultar miembros del grupo");
    } finally {
      setLoading(false);
    }
  }, [groupId, graph]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Filtro en cliente por nombre/correo
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.nombre?.toLowerCase() ?? "").includes(q) ||
      (r.correo?.toLowerCase() ?? "").includes(q)
    );
  }, [rows, search]);

  // Paginación en cliente
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const pageRows = React.useMemo(() => filtered.slice(start, end), [filtered, start, end]);
  const hasNext = end < filtered.length;
  const nextPage = () => hasNext && setPageIndex((i) => i + 1);
  const prevPage = () => setPageIndex((i) => Math.max(0, i - 1));

  /* ===========
     Acciones
     =========== */

  // Agregar por userId (si tu UI lo necesita)
  const addCollaboratorByUserId = React.useCallback(
    async (userId: string) => {
      if (!groupId || !userId) return;
      await addMemberByUserId(groupId, userId, graph);
      await refresh();
    },
    [groupId, graph, refresh]
  );

  // Eliminar por userId (preferido si la tabla tiene id)
  const deleteByUserId = React.useCallback(
    async (userId: string) => {
      if (!groupId || !userId) return;
      await removeMemberByUserId(groupId, userId, graph);
      await refresh();
    },
    [groupId, graph, refresh]
  );

  // Eliminar por correo (si tu tabla se maneja por email)
  const deleteByEmail = React.useCallback(
    async (email: string) => {
      if (!groupId || !email) return;
      await removeMemberByEmail(groupId, email, graph);
      await refresh();
    },
    [groupId, graph, refresh]
  );

  // API unificada para UI (acepta id o email)
  const deleteCollaborator = React.useCallback(
    async (idOrEmail: string) => {
      const looksLikeGuid = /^[0-9a-f-]{36}$/i.test(idOrEmail);
      if (looksLikeGuid) return deleteByUserId(idOrEmail);
      return deleteByEmail(idOrEmail);
    },
    [deleteByEmail, deleteByUserId]
  );

  return {
    // datos
    rows: pageRows,
    loading,
    error,

    // búsqueda/paginación
    search, setSearch,
    pageSize, setPageSize,
    pageIndex, hasNext, nextPage, prevPage,

    // control
    refresh,

    // acciones
    addCollaboratorByUserId,
    deleteByUserId,
    deleteByEmail,
    deleteCollaborator,
  };
}
