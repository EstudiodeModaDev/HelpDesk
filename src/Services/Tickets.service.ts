// src/Services/Tickets.service.ts
import { GraphRest } from '../graph/GraphRest';
import type { GetAllOpts, PageResult } from '../Models/Commons';
import type { AttachmentLite, Ticket } from '../Models/Tickets';

export class TicketsService {
  private graph!: GraphRest;
  private hostname!: string;
  private sitePath!: string;
  private listName!: string;

  private siteId?: string;
  private listId?: string;

  constructor(
    graph: GraphRest,
    hostname = 'estudiodemoda.sharepoint.com',
    // ⚠️ SIN barra final
    sitePath = '/sites/TransformacionDigital/IN/HD',
    listName = 'Tickets'
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith('/') ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

   private esc(s: string) { return String(s).replace(/'/g, "''"); }

  // cache (mem + localStorage opcional)
    private loadCache() {
        try {
        const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
        const raw = localStorage.getItem(k);
        if (raw) {
            const { siteId, listId } = JSON.parse(raw);
            this.siteId = siteId || this.siteId;
            this.listId = listId || this.listId;
        }
        } catch {}
    }

    private saveCache() {
        try {
        const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
        localStorage.setItem(k, JSON.stringify({ siteId: this.siteId, listId: this.listId }));
        } catch {}
    }

    private async ensureIds() {
        if (!this.siteId || !this.listId) this.loadCache();

        if (!this.siteId) {
        const site = await this.graph.get<any>(`/sites/${this.hostname}:${this.sitePath}`);
        this.siteId = site?.id;
        if (!this.siteId) throw new Error('No se pudo resolver siteId');
        this.saveCache();
        }

        if (!this.listId) {
        const lists = await this.graph.get<any>(
            `/sites/${this.siteId}/lists?$filter=displayName eq '${this.esc(this.listName)}'`
        );
        const list = lists?.value?.[0];
        if (!list?.id) throw new Error(`Lista no encontrada: ${this.listName}`);
        this.listId = list.id;
        this.saveCache();
        }
    }

  // ---------- mapping ----------
  
  private toModel(item: any): Ticket {
    const f = item?.fields ?? {};
    return {
      // Identificadores / asunto
      ID: String(f.ID ?? f.Id ?? f.id ?? item?.id ?? ''),
      IdCasoPadre: f.IdCasoPadre ?? null,
      Title: f.Title ?? '',

      // Fechas (tu UI usa "dd/mm/yyyy hh:mm")
      FechaApertura: f.FechaApertura ?? '',
      TiempoSolucion: f.TiempoSolucion ?? '',

      // Estado / categorización
      Fuente: f.Fuente ?? '',
      Descripcion: f.Descripcion ?? '',
      Categoria: f.Categoria ?? '',
      SubCategoria: f.Subcategoria ?? f.SubCategoria ?? '',
      SubSubCategoria: f.Articulo ?? f.SubSubCategoria ?? '',
      Estadodesolicitud: f.Estadodesolicitud ?? '',
      ANS: f.ANS ?? '',

      // Resolutor
      Nombreresolutor: f.Nombreresolutor ?? '',
      IdResolutor: f.IdResolutor ?? '',
      CorreoResolutor: f.Correoresolutor ?? '',

      // Solicitante
      Solicitante: f.Solicitante ?? '',
      CorreoSolicitante: f.CorreoSolicitante ?? '',

      // Observador
      Observador: f.Observador ?? '',
      CorreoObservador: f.CorreoObservador ?? '',
    };
  }

  // ---------- CRUD ----------
  async create(record: Omit<Ticket, 'ID'>) {
    await this.ensureIds();
    console.log(record)
    const res = await this.graph.post<any>(
    `/sites/${this.siteId}/lists/${this.listId}/items`,
    { fields: record }
    );
    console.log(res)
    return this.toModel(res);
}

  async update(id: string, changed: Partial<Omit<Ticket, 'ID'>>) {
        await this.ensureIds();
        await this.graph.patch<any>(
        `/sites/${this.siteId}/lists/${this.listId}/items/${id}/fields`,
        changed
        );
        const res = await this.graph.get<any>(
        `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
        );
        return this.toModel(res);
  }

  async delete(id: string) {
      await this.ensureIds();
      await this.graph.delete(`/sites/${this.siteId}/lists/${this.listId}/items/${id}`);
  }

  async get(id: string) {
      await this.ensureIds();
      const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
      );
      return this.toModel(res);
  }

  async getAll(opts?: GetAllOpts): Promise<PageResult<Ticket>> {
    await this.ensureIds();
    const qs = new URLSearchParams({ $expand: 'fields' });
    if (opts?.filter)  qs.set('$filter', opts.filter);
    if (opts?.orderby) qs.set('$orderby', opts.orderby);
    if (opts?.top != null) qs.set('$top', String(opts.top));
    const url = `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`;
    const res = await this.fetchPage(url);
    return res
  }

  // Seguir el @odata.nextLink tal cual lo entrega Graph
  async getByNextLink(nextLink: string): Promise<PageResult<Ticket>> {
    return this.fetchPage(nextLink, /*isAbsolute*/ true);
  }

  private async fetchPage(url: string, isAbsolute = false): Promise<PageResult<Ticket>> {
    const res = isAbsolute
      ? await this.graph.getAbsolute<any>(url)  // 👈 URL absoluta (nextLink)
      : await this.graph.get<any>(url);         // 👈 path relativo

    const raw = Array.isArray(res?.value) ? res.value : [];
    const items = raw.map((x: any) => this.toModel(x));
    const nextLink = res?.['@odata.nextLink'] ? String(res['@odata.nextLink']) : null;
    return { items, nextLink };
  }

  async listAttachments(itemId: string | number): Promise<AttachmentLite[]> {
    await this.ensureIds();
    try {
      const url =
        `/sites/${this.siteId}/lists/${this.listId}/items/${itemId}` +
        `/driveItem/children?$select=id,name,size,webUrl,lastModifiedDateTime,@microsoft.graph.downloadUrl`;

      const res = await this.graph.get<any>(url);
      const rows = Array.isArray(res?.value) ? res.value : [];

      return rows.map((x: any) => ({
        id: String(x.id),
        name: String(x.name ?? ""),
        size: Number(x.size ?? 0),
        webUrl: String(x.webUrl ?? ""),
        downloadUrl: (x['@microsoft.graph.downloadUrl'] as string) ?? null,
        lastModifiedDateTime: x.lastModifiedDateTime,
      }));
    } catch (err: any) {
      // Si el item no tiene carpeta de adjuntos, Graph puede responder 404
      if (String(err?.status || err).includes("404")) return [];
      throw err;
    }
  }

    /*async downloadAttachment(downloadUrl: string): Promise<Blob> {
      return await this.graph.fetchBlobAbsolute(downloadUrl);
    }*/

}



