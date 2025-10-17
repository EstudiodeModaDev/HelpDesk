import type { ReFactura } from "../Models/RegistroFacturaInterface";
import { GraphRest } from "../graph/GraphRest";
import type { GetAllOpts } from "../Models/Commons";
import { ensureIds } from "../utils/Commons";

export class ReFacturasService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;
  private siteId?: string;
  private listId?: string;

  constructor(
    graph: GraphRest,
    hostname = "estudiodemoda.sharepoint.com",
    sitePath = "/sites/TransformacionDigital/IN/Test",
    listName = "facturas"
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  private toModel(item: any): ReFactura {
    const f = item?.fields ?? {};
    return {
      id0: Number(item?.id ?? 0),
      fechadeemision: f.FechadeEmision ?? "",
      numerofactura: f.Numerofactura ?? "",
      proveedor: f.Proveedor ?? "",
      Title: f.Title ?? "",
      tipodefactura: f.TipoFactura ?? "",
      item: f.Item ?? "",
      descripcionitem: f.Descripcion ?? "",
      valor: Number(f.Valor) || 0,
      cc: f.Cc ?? "",
      co: f.Co ?? "",
      un: f.Un ?? "",
      detalle: f.Detalle ?? "",
    };
  }

  // 🟢 Crear factura
  async create(record: Omit<ReFactura, "id0">) {
    const ids = await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    this.siteId = ids.siteId;
    this.listId = ids.listId;

    const res = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      { fields: record }
    );

    return this.toModel(res);
  }

  // 🔍 Obtener todas las facturas
  async getAll(opts?: GetAllOpts) {
    const ids = await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    this.siteId = ids.siteId;
    this.listId = ids.listId;

    const qs = new URLSearchParams();
    qs.set("$expand", "fields");
    qs.set("$select", "id,webUrl");
    if (opts?.orderby) qs.set("$orderby", opts.orderby);
    if (opts?.top != null) qs.set("$top", String(opts.top));
    if (opts?.filter) qs.set("$filter", opts.filter);

    const url = `/sites/${this.siteId}/lists/${this.listId}/items?${qs.toString()}`;
    const res = await this.graph.get<any>(url);

    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  // ✏️ Actualizar factura
  async update(id: string, changed: Partial<ReFactura>) {
    if (!id) throw new Error("ID de factura requerido");
    const ids = await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    this.siteId = ids.siteId;
    this.listId = ids.listId;

    const res = await this.graph.patch<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${id}/fields`,
      changed
    );
    return this.toModel({ id, fields: res });
  }

  // 🗑️ Eliminar factura
  async delete(id: string) {
    if (!id) throw new Error("ID de factura requerido");
    const ids = await ensureIds(this.siteId, this.listId, this.graph, this.hostname, this.sitePath, this.listName);
    this.siteId = ids.siteId;
    this.listId = ids.listId;

    await this.graph.delete(`/sites/${this.siteId}/lists/${this.listId}/items/${id}`);
  }
}
