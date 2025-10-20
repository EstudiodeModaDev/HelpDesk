// src/utils/Commons.ts
import type { GraphRest } from "../graph/GraphRest";

export type EnsureIdsResult = { siteId: string; listId: string };

export const esc = (s: string) => String(s).replace(/'/g, "''");

/** Lee cache (si existe) y lo devuelve */
function loadCache(
  hostname: string,
  sitePath: string,
  listName: string
): Partial<EnsureIdsResult> {
  try {
    const k = `sp:${hostname}${sitePath}:${listName}`;
    const raw = localStorage.getItem(k);
    if (raw) return JSON.parse(raw) as Partial<EnsureIdsResult>;
  } catch {}
  return {};
}

/** Persiste en cache si ambos IDs existen */
function saveCache(
  hostname: string,
  sitePath: string,
  listName: string,
  siteId?: string,
  listId?: string
) {
  try {
    if (!siteId || !listId) return;
    const k = `sp:${hostname}${sitePath}:${listName}`;
    localStorage.setItem(k, JSON.stringify({ siteId, listId }));
  } catch {}
}

/**
 * Resuelve y devuelve { siteId, listId } para una lista de SharePoint usando Graph.
 * - Usa cache localStorage si está disponible.
 * - Corrige sitePath y evita el ":" sobrante al final.
 */
export async function ensureIds(
  siteId: string | undefined,
  listId: string | undefined,
  graph: GraphRest,
  hostname: string,
  sitePath: string,   // p.ej. "/sites/TransformacionDigital/IN/HD"
  listName: string    // p.ej. "Tickets"
): Promise<EnsureIdsResult> {
  // normaliza sitePath
  const sp = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;

  // 1) intenta cache
  if (!siteId || !listId) {
    const cached = loadCache(hostname, sp, listName);
    siteId = cached.siteId ?? siteId;
    listId = cached.listId ?? listId;
  }

  // 2) resuelve siteId si falta
  if (!siteId) {
    // OJO: sin colon al final
    const site = await graph.get<any>(`/sites/${hostname}:${sp}`);
    siteId = site?.id;
    if (!siteId) throw new Error("No se pudo resolver siteId");
    saveCache(hostname, sp, listName, siteId, listId);
  }

  // 3) resuelve listId si falta
  if (!listId) {
    const lists = await graph.get<any>(
      `/sites/${siteId}/lists?$filter=displayName eq '${esc(listName)}'`
    );
    const list = lists?.value?.[0];
    if (!list?.id) throw new Error(`Lista no encontrada: ${listName}`);
    listId = list.id as string;
    saveCache(hostname, sp, listName, siteId, listId);
  }

  return { siteId, listId };
}


export function  norm (s?: string){
 return (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export const fileToBase64 = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result)); // data:image/png;base64,xxx
    reader.onerror = () => reject(reader.error ?? new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });

export function fileToBasePA64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.readAsDataURL(file);
    fr.onload = () => {
      const dataUrl = String(fr.result || "");
      const pureBase64 = dataUrl.substring(dataUrl.indexOf(",") + 1); // 👈 solo base64
      resolve(pureBase64);
    };
    fr.onerror = reject;
  });
}