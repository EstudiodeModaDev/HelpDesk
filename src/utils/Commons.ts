import type { GraphRest } from "../graph/GraphRest";

function saveCache(hostname: string, sitePath: string, listName: string, siteId: string, listId: string) {
    try {
      const k = `sp:${hostname}${sitePath}:${listName}`;
      localStorage.setItem(k, JSON.stringify({ siteId: siteId, listId: listId }));
    } catch {}
  }
function loadCache(hostname: string, sitePath: string, listName: string, siteId: string, listId: string) {
  try {
    const k = `sp:${hostname}${sitePath}:${listName}`;
    const raw = localStorage.getItem(k);
    if (raw) {
      const data = JSON.parse(raw) as Partial<{ siteId: string; listId: string }>;
      // usar las del cache si existen; si no, mantener las recibidas
      siteId = data?.siteId || siteId;
      listId = data?.listId || listId;
    }
  } catch {}
}

export function esc(s: string) { return String(s).replace(/'/g, "''"); }

export async function ensureIds(siteId: string | undefined, listId: string | undefined, graph: GraphRest, hostname: string, sitePath: string, listName: string) {
    if (!siteId || !listId) loadCache(hostname, sitePath, listName, siteId!, listId!);

    if (!siteId) {
      const site = await graph.get<any>(`/sites/${hostname}:${sitePath}:`);
      siteId = site?.id;
      if (!siteId) throw new Error('No se pudo resolver siteId');
      saveCache(hostname, sitePath, listName, siteId, listId!);
    }

    if (!listId) {
      const lists = await graph.get<any>(
        `/sites/${siteId}/lists?$filter=displayName eq '${esc(listName)}'`
      );
      const list = lists?.value?.[0];
      if (!list?.id) throw new Error(`Lista no encontrada: ${listName}`);
      listId = list.id;
      saveCache(hostname, sitePath, listName, siteId, listId!);
    }
  }