// src/hooks/useWorkers.ts
import * as React from 'react';
import { useAuth } from '../auth/authContext';
import { GraphRest } from '../graph/GraphRest';
import type { UserOption, Worker } from '../Models/Commons';

type Options = {
  onlyEnabled?: boolean;
  domainFilter?: string;
  previewLimit?: number;
  spListService?: { getAll: (opts?: any) => Promise<any[]> };
  spOrderBy?: string;
  spTop?: number;
  spFilter?: string;
};

const norm = (s: string) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

type CacheKey = string;
const cache: Record<CacheKey, { data: Worker[] | null; promise: Promise<Worker[]> | null }> = {};

function cacheKey(opts: Options) {
  return JSON.stringify({
    onlyEnabled: opts.onlyEnabled ?? true,
    domainFilter: (opts.domainFilter ?? '').toLowerCase(),
    previewLimit: opts.previewLimit ?? null,
    hasSP: !!opts.spListService,
    spOrderBy: opts.spOrderBy ?? '',
    spTop: opts.spTop ?? 0,
    spFilter: opts.spFilter ?? '',
  });
}

function mapGraphUser(u: any, i: number): Worker {
  const id = u.id ?? u.userPrincipalName ?? u.mail ?? i;
  return {
    id: String(id),
    displayName: String(u.displayName ?? '—'),
    mail: String(u.mail ?? u.userPrincipalName ?? ''),
    jobTitle: String(u.jobTitle ?? ''),
  };
}

function mapSPRowToWorker(r: any): Worker {
  const f = r?.fields ?? r ?? {};
  return {
    id: String(r.ID ?? r.Id ?? f.ID ?? f.Id ?? ''),
    displayName: String(
      f.Nombre ?? f.DisplayName ?? f.Title ?? r.Nombre ?? r.DisplayName ?? r.Title ?? '—'
    ),
    mail: String(f.Correo ?? f.Email ?? r.Correo ?? r.Email ?? ''),
    jobTitle: String(f.Cargo ?? r.Cargo ?? ''),
  };
}

async function fetchUsersFromGraph(graph: GraphRest, opts: Options): Promise<Worker[]> {
  const onlyEnabled = opts.onlyEnabled ?? true;
  const domain = (opts.domainFilter ?? '').toLowerCase();

  const select = encodeURIComponent('id,displayName,mail,userPrincipalName,jobTitle,accountEnabled');
  const top = 999;
  const filters: string[] = [];
  if (onlyEnabled) filters.push('accountEnabled eq true');

  let url = `/users?$select=${select}&$top=${top}` + (filters.length ? `&$filter=${encodeURIComponent(filters.join(' and '))}` : '');
  const acc: any[] = [];

  while (url) {
    const page = await graph.get<any>(url);
    const rows: any[] = Array.isArray(page?.value) ? page.value : [];
    acc.push(...rows);
    const next = page?.['@odata.nextLink'] as string | undefined;
    url = next ? next.replace('https://graph.microsoft.com/v1.0', '') : '';
  }

  const emailToUser = new Map<string, any>();
  for (const u of acc) {
    const email = String(u.mail || u.userPrincipalName || '').trim().toLowerCase();
    if (!email) continue;
    if (domain && !email.endsWith(`@${domain}`)) continue;
    if (!emailToUser.has(email)) emailToUser.set(email, u);
  }
  return Array.from(emailToUser.values()).map(mapGraphUser);
}

async function fetchUsersFromSharePoint(opts: Options): Promise<Worker[]> {
  if (!opts.spListService) return [];
  const items = await opts.spListService.getAll({
    orderby: opts.spOrderBy ?? 'fields/Title asc',
    top: opts.spTop ?? 5000,
    ...(opts.spFilter ? { filter: opts.spFilter } : {}),
  });

  const domain = (opts.domainFilter ?? '').toLowerCase();
  const mapped = (items ?? []).map(mapSPRowToWorker);

  return mapped.filter(w => {
    const email = String(w.mail ?? '').toLowerCase();
    if (!email) return false;
    return domain ? email.endsWith(`@${domain}`) : true;
  });
}

export function useWorkers(options: Options = {}) {
  const { ready, getToken } = useAuth();
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [workersOptions, setWorkersOptions] = React.useState<UserOption[]>([]);
  const [loadingWorkers, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const key = cacheKey(options);

  // === helpers ===
  const mapWorkersToOptions = React.useCallback((list: Worker[]): UserOption[] => {
    return (list ?? [])
      .map((u) => ({
        value: (u.mail || String(u.id) || '').trim(),
        label: u.displayName || u.mail || '—',
        id: u.id != null ? String(u.id) : undefined,
        email: u.mail,
        jobTitle: u.jobTitle,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const load = React.useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      if (cache[key]?.data) {
        const cached = cache[key]!.data!;
        const sliced = typeof options.previewLimit === 'number' ? cached.slice(0, options.previewLimit) : cached;
        setWorkers(sliced);
        setWorkersOptions(mapWorkersToOptions(sliced));
        return;
      }
      if (!cache[key]) cache[key] = { data: null, promise: null };

      if (!cache[key]!.promise) {
        const graph = new GraphRest(getToken);
        cache[key]!.promise = (async () => {
          const [fromGraph, fromSP] = await Promise.all([
            fetchUsersFromGraph(graph, options),
            fetchUsersFromSharePoint(options),
          ]);

          const emailToWorker = new Map<string, Worker>();
          for (const g of fromGraph) {
            const email = String(g.mail ?? '').trim().toLowerCase();
            if (email) emailToWorker.set(email, g);
          }
          for (const s of fromSP) {
            const email = String(s.mail ?? '').trim().toLowerCase();
            if (!email) continue;
            if (!emailToWorker.has(email)) emailToWorker.set(email, s);
          }

          const merged = Array.from(emailToWorker.values());
          merged.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

          cache[key]!.data = merged;
          return merged;
        })().finally(() => {
          cache[key]!.promise = null;
        });
      }

      const data = await cache[key]!.promise!;
      const sliced = typeof options.previewLimit === 'number' ? data.slice(0, options.previewLimit) : data;
      setWorkers(sliced);
      setWorkersOptions(mapWorkersToOptions(sliced)); // <-- faltaba setear en la rama no-cache
    } catch (e: any) {
      setWorkers([]);
      setWorkersOptions([]);
      setError(e?.message ?? 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, [ready, getToken, key, options.previewLimit, mapWorkersToOptions]); // usa solo lo necesario

  // MUEVE el useEffect DESPUÉS de declarar `load`
  React.useEffect(() => { load(); }, [load, key]);

  const filter = React.useCallback((term: string) => {
    if (!term) return workers;
    const q = norm(term);
    return workers.filter(w => norm(`${w.displayName} ${w.jobTitle ?? ''} ${w.mail ?? ''}`).includes(q));
  }, [workers]);

  const refresh = React.useCallback(async () => {
    if (!ready) return;
    cache[key] = { data: null, promise: null };
    await load();
  }, [ready, load, key]);

  return { workers, workersOptions, loadingWorkers, error, filter, refresh };
}
