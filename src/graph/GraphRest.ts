export class GraphRest {
  private getToken: () => Promise<string>;
  private base = 'https://graph.microsoft.com/v1.0';

  constructor(getToken: () => Promise<string>, baseUrl?: string) {
    this.getToken = getToken;
    if (baseUrl) this.base = baseUrl;
  }

  // Core: hace la llamada y parsea respuesta de forma segura (maneja 204/no content)
  private async call<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: any,
    init?: RequestInit
  ): Promise<T> {
    const token = await this.getToken();
    const hasBody = body !== undefined && body !== null;

    const res = await fetch(this.base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        // Quita esta Prefer si no la necesitas
        Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
        ...(init?.headers || {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      ...init,
    });

    // ---- Manejo de error con mensaje detallado de Graph ----
    if (!res.ok) {
      let detail = '';
      try {
        const txt = await res.text();
        if (txt) {
          try {
            const j = JSON.parse(txt);
            detail = j?.error?.message || j?.message || txt;
          } catch {
            detail = txt;
          }
        }
      } catch {}
      throw new Error(`${method} ${path} → ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
    }

    // ---- 204 No Content o respuesta vacía ----
    if (res.status === 204) return undefined as unknown as T;

    // ---- Parseo seguro según content-type ----
    const ct = res.headers.get('content-type') || '';
    const txt = await res.text(); // evita error si está vacío
    if (!txt) return undefined as unknown as T;

    if (ct.includes('application/json')) {
      return JSON.parse(txt) as T;
    }

    // Si la respuesta no es JSON, retorna texto
    return txt as unknown as T;
  }

  async getBlob(path: string) {
      const token = await this.getToken(); // mismo token que ya te sirve
      const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Graph ${res.status}`);
    return await res.blob();
  }

  // Helpers públicos
  get<T = any>(path: string, init?: RequestInit) {
    return this.call<T>('GET', path, undefined, init);
  }

  post<T = any>(path: string, body: any, init?: RequestInit) {
    return this.call<T>('POST', path, body, init);
  }

  patch<T = any>(path: string, body: any, init?: RequestInit) {
    // PATCH a /fields suele devolver 204; este call ya lo maneja
    return this.call<T>('PATCH', path, body, init);
  }

  delete(path: string, init?: RequestInit) {
    // DELETE típicamente devuelve 204 No Content
    return this.call<void>('DELETE', path, undefined, init);
  }

  async getAbsolute<T = any>(url: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken(); 

    // 1) Separa headers de las demás opciones para no pisarlas
    const { headers: initHeaders, ...restInit } = init ?? {};

    // 2) Merge de headers sin sobrescribir Authorization
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json;odata=nometadata");
    // opcional: útil para OData (quita warnings “randomly may fail…” que no aportan)
    // headers.set("Prefer", "odata.maxpagesize=500"); // ejemplo
    if (initHeaders) {
      const ih = new Headers(initHeaders as any);
      ih.forEach((v, k) => headers.set(k, v));
    }

    // 3) Ejecuta fetch con merge correcto
    const res = await fetch(url, {
      method: "GET",
      ...restInit,       // ← aquí jamás viene 'headers'
      headers,           // ← headers finales ya fusionados
    });

    if (!res.ok) {
      let detail = "";
      try {
        // Intenta leer texto una vez
        const txt = await res.text();
        if (txt) {
          try {
            const j = JSON.parse(txt);
            detail = j?.error?.message ?? j?.message ?? txt;
          } catch {
            detail = txt;
          }
        }
      } catch {}
      throw new Error(`GET (absolute) ${url} → ${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
    }

    if (res.status === 204) return undefined as unknown as T;

    // 4) Devuelve JSON si el content-type lo indica; si no, regresa texto tal cual
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return (await res.json()) as T;
    }
    const txt = await res.text();
    // si esperas cosas tipo XML/HTML de SharePoint en errores 200, lo devuelves como string
    return txt as unknown as T;
  }

}
