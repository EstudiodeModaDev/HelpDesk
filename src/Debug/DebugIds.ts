// DebugIds.ts (temporal)
import { GraphRest } from '../graph/GraphRest';

export async function debugResolveTicketsIds(getToken: () => Promise<string>) {
  const graph = new GraphRest(getToken);

  const hostname = 'estudiodemoda.sharepoint.com';
  const sitePath = '/sites/TransformacionDigital/IN/HD'; // sin barra final
  const listDisplayName = 'Tickets';

  // 1) Resuelve el site por path (no necesitas el GUID compuesto)
  const site = await graph.get<any>(`/sites/${hostname}:${sitePath}`);
  console.log('[DEBUG] site:', site);
  const siteGraphId = site?.id; // ← ESTE es el id que usa Graph (3 partes)
  if (!siteGraphId) throw new Error('No se pudo resolver site.id');

  // 2) Lista todas las listas del site para ver el nombre real
  const allLists = await graph.get<any>(`/sites/${siteGraphId}/lists`);
  console.log('[DEBUG] lists:', allLists?.value?.map((l: any) => ({
    id: l.id, displayName: l.displayName, webUrl: l.webUrl
  })));

  // 3) Busca la lista "Tickets" por displayName exacto (sensitivo)
  const filtered = await graph.get<any>(
    `/sites/${siteGraphId}/lists?$filter=displayName eq '${listDisplayName}'`
  );
  const list = filtered?.value?.[0];
  if (!list) {
    throw new Error(`No encontré una lista con displayName EXACTO = '${listDisplayName}'. Revisa el listado anterior y usa ese nombre tal cual (espacios/acentos).`);
  }

  const listId = list.id;
  console.log('[DEBUG] RESUELTO:', { siteGraphId, listId });

  // 4) Test: trae 3 ítems
  const items = await graph.get<any>(
    `/sites/${siteGraphId}/lists/${listId}/items?$expand=fields&$top=3`
  );
  console.log('[DEBUG] primeros items:', items?.value);

  return { siteGraphId, listId };
}
