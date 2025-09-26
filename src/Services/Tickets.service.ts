// src/Services/Tickets.service.ts
import { GraphRest } from '../graph/GraphRest';
import type { GetAllOpts } from '../Models/Commons';
import type { Ticket } from '../Models/Tickets';
import { ensureIds, esc } from '../utils/Commons';

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

  // ---------- mapping ----------
  private toModel(item: any): Ticket {
    const f = item?.fields ?? {};
    return {
      // Identificadores / asunto
      id: String(f.ID ?? f.Id ?? f.id ?? item?.id ?? ''),
      IdCasoPadre: f.IdCasoPadre ?? null,
      Title: f.Title ?? '',

      // Fechas (tu UI usa "dd/mm/yyyy hh:mm")
      FechaApertura: f.FechaApertura ?? '',
      TiempoSolucion: f.TiempoSolucion ?? '',

      // Estado / categorización
      Fuente: f.Fuente ?? '',
      Descripcion: f.Descripcion ?? '',
      Categoria: f.Categoria ?? '',
      Subcategoria: f.Subcategoria ?? f.SubCategoria ?? '',
      Articulo: f.Articulo ?? f.SubSubCategoria ?? '',
      estado: f.Estadodesolicitud ?? '',
      ANS: f.ANS ?? '',

      // Resolutor
      resolutor: f.Nombreresolutor ?? '',
      resolutorId: f.IdResolutor ?? '',
      CorreoResolutor: f.Correoresolutor ?? '',

      // Solicitante
      solicitante: f.Solicitante ?? '',
      CorreoSolicitante: f.CorreoSolicitante ?? '',

      // Observador
      observador: f.Observador ?? '',
      CorreoObservador: f.CorreoObservador ?? '',
    };
  }

  // ---------- ids ----------
  private async ensure(): Promise<void> {
    // Asegura y persiste los IDs resueltos
    const ids = await ensureIds(
      this.siteId,
      this.listId,
      this.graph,
      this.hostname,
      this.sitePath,
      this.listName
    );
    this.siteId = ids.siteId;
    this.listId = ids.listId;
  }

  // ---------- CRUD ----------
  async create(record: Omit<Ticket, 'ID' | 'id'>) {
    await this.ensure();
    const res = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      { fields: record }
    );
    return this.toModel(res);
  }

  async update(id: string | number, changed: Partial<Omit<Ticket, 'ID' | 'id'>>) {
    await this.ensure();
    await this.graph.patch<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}/fields`,
      changed
    );
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
    );
    return this.toModel(res);
  }

  async delete(id: string | number) {
    await this.ensure();
    await this.graph.delete(`/sites/${this.siteId}/lists/${this.listId}/items/${id}`);
  }

  async get(id: string | number) {
    await this.ensure();
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
    );
    return this.toModel(res);
  }

  async getAll(opts?: GetAllOpts) {
    await this.ensure();

    const qs = new URLSearchParams();
    qs.set('$expand', 'fields');      // necesario para leer campos
    // qs.set('$select', 'id,webUrl,fields'); // opcional

    if (opts?.orderby) qs.set('$orderby', opts.orderby.trim());
    if (opts?.top != null) qs.set('$top', String(opts.top));
    if (opts?.filter) qs.set('$filter', opts.filter.trim());

    // Evita '+' por espacios
    const query = qs.toString().replace(/\+/g, '%20');

    const url = `/sites/${encodeURIComponent(this.siteId!)}/lists/${encodeURIComponent(this.listId!)}/items?${query}`;

    try {
      const res = await this.graph.get<any>(url);
      return (res.value ?? []).map((x: any) => this.toModel(x));
    } catch (e: any) {
      // Reintenta sin $filter si rompió por sintaxis (útil para diagnóstico)
      const code = e?.error?.code ?? e?.code;
      if (code === 'itemNotFound' && opts?.filter) {
        const qs2 = new URLSearchParams(qs);
        qs2.delete('$filter');
        const url2 = `/sites/${this.siteId}/lists/${this.listId}/items?${qs2.toString()}`;
        const res2 = await this.graph.get<any>(url2);
        return (res2.value ?? []).map((x: any) => this.toModel(x));
      }
      throw e;
    }
  }

  // ---------- helpers de consulta ----------
  async findById(itemId: string | number, top = 1) {
    await this.ensure();
    // Mejor filtrar por el id del listItem (numérico) en top-level, no en fields/*
    const idNum = Number(itemId);
    const qs = new URLSearchParams({
      $expand: 'fields',
      $filter: Number.isFinite(idNum) ? `id eq ${idNum}` : `id eq ${esc(String(itemId))}`,
      $top: String(top),
    });
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
    );
    return (res.value ?? []).map((x: any) => this.toModel(x));
  }
}
