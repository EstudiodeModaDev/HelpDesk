
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
        //Información del ticket
        id: f.id,
        IdCasoPadre: f.IdCasoPadre,
        Title:  f.Title, //Asunto
        FechaApertura: f.FechaApertura, // "dd/mm/yyyy hh:mm"
        TiempoSolucion: f.TiempoSolucion,   // "dd/mm/yyyy hh:mm"
        Fuente: f.Fuente,        
        Descripcion: f.Descripcion,
        Categoria: f.Categoria,
        Subcategoria: f.SubCategoria,
        Articulo: f.SubSubCategoria,
        estado: f.Estadodesolicitud,
        ANS: f.ANS,

        //Información del resolutor
        resolutor: f.Nombreresolutor,
        resolutorId: f.IdResolutor,
        CorreoResolutor: f.Correoresolutor, 

        //Información del solicitante
        solicitante: f.Solicitante,
        CorreoSolicitante: f.CorreoSolicitante,

        //Información del observador
        observador: f.Observador,
        CorreoObservador: f.CorreoObservador,
    };
  }

  // ---------- CRUD ----------
  async create(record: Omit<Ticket, 'ID'>) {
    await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    const res = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      { fields: record }
    );
    return this.toModel(res);
  }

  async update(id: string, changed: Partial<Omit<Ticket, 'ID'>>) {
    await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
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
    await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    await this.graph.delete(`/sites/${this.siteId}/lists/${this.listId}/items/${id}`);
  }

  async get(id: string) {
    await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}?$expand=fields`
    );
    return this.toModel(res);
  }

  async getAll(opts?: GetAllOpts) {
    await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);

    // ID -> id, Title -> fields/Title (cuando NO está prefijado con '/')
    const normalizeFieldTokens = (s: string) =>
      s
        .replace(/\bID\b/g, 'id')
        .replace(/(^|[^/])\bTitle\b/g, '$1fields/Title');

    const escapeODataLiteral = (v: string) => v.replace(/'/g, "''");

    // Normaliza expresiones del $filter (minimiza 404 por sintaxis)
    const normalizeFilter = (raw: string) => {
      let out = normalizeFieldTokens(raw.trim());
      // escapa todo literal '...'
      out = out.replace(/'(.*?)'/g, (_m, p1) => `'${escapeODataLiteral(p1)}'`);
      return out;
    };

    const normalizeOrderby = (raw: string) => normalizeFieldTokens(raw.trim());

    const qs = new URLSearchParams();
    qs.set('$expand', 'fields');        // necesario si filtras por fields/*
    qs.set('$select', 'id,webUrl');     // opcional; añade fields(...) si quieres
    if (opts?.orderby) qs.set('$orderby', normalizeOrderby(opts.orderby));
    if (opts?.top != null) qs.set('$top', String(opts.top));
    if (opts?.filter) qs.set('$filter', normalizeFilter(String(opts.filter)));

    // Evita '+' por espacios (algunos proxies se quejan)
    const query = qs.toString().replace(/\+/g, '%20');

    const url = `/sites/${encodeURIComponent(this.siteId!)}/lists/${encodeURIComponent(this.listId!)}/items?${query}`;

    try {
      const res = await this.graph.get<any>(url);
      return (res.value ?? []).map((x: any) => this.toModel(x));
    } catch (e: any) {
      // Si la ruta es válida pero el $filter rompe, reintenta sin $filter para diagnóstico
      const code = e?.error?.code ?? e?.code;
      if (code === 'itemNotFound' && opts?.filter) {
        const qs2 = new URLSearchParams(qs);
        qs2.delete('$filter');
        const url2 = `/sites/${encodeURIComponent(this.siteId!)}/lists/${encodeURIComponent(this.listId!)}/items?${qs2.toString()}`;
        const res2 = await this.graph.get<any>(url2);
        return (res2.value ?? []).map((x: any) => this.toModel(x));
      }
      throw e;
    }
  }

  // ---------- helpers de consulta (opcionales) ----------
  async findById(ID: string, top = 1) {
    await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    const qs = new URLSearchParams({
      $expand: 'fields',
      $filter: `fields/ID eq '${esc(ID)}'`,
      $top: String(top),
    });
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`
    );
    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

}






