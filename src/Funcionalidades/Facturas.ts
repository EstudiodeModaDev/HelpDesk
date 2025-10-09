import * as React from "react";
import { useState, useMemo } from "react";
import type { FormErrors, InvoicePayload, Item, Proveedor } from "../Models/Facturas";



/* ===== Servicios por defecto (fallback) ===== */
const defaultServices = {
  async getProveedores(): Promise<Proveedor[]> {
    await delay(200);
    return [
      { id: "p1", nombre: "ACME S.A.", nit: "900123456-7" },
      { id: "p2", nombre: "Distribuciones XYZ", nit: "800987654-3" },
      { id: "p3", nombre: "Tecnologías Beta",   nit: "901222333-1" },
    ];
  },
  async getItems(): Promise<Item[]> {
    await delay(200);
    return [
      { Identificador: "i1", descripcion: "Bolsa x100",               valor: 2500 },
      { Identificador: "i2", descripcion: "Caja cartón",              valor: 5200 },
      { Identificador: "i3", descripcion: "Etiqueta código barras",   valor: 180  },
    ];
  },
  async createItem(newItem: { descripcion: string; valor: number }): Promise<Item> {
    await delay(200);
    return { Identificador: `i${Math.floor(Math.random() * 100000)}`, ...newItem };
  },
  async saveInvoice(payload: InvoicePayload): Promise<{ id: string }> {
    await delay(400);
    console.log("[DEBUG] payload factura:", payload);
    return { id: `F-${Date.now()}` };
  },
};

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/* ===== API del hook: puedes inyectar servicios parciales ===== */
export type FacturasServices = Partial<typeof defaultServices>;

export function useFacturas(services?: FacturasServices) {
  // Merge: todo lo no provisto desde fuera usa defaults
  const svc = useMemo(() => ({ ...defaultServices, ...(services ?? {}) }), [services]);

  const [state, setState] = useState<InvoicePayload>({
    centroCostos: "",
    co: "",
    fecha: "",
    lineas: [],
    nit: "",
    numero: "",
    proveedorId: "",
    total: 0,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof InvoicePayload>(k: K, v: InvoicePayload[K]) =>
    setState(s => ({ ...s, [k]: v }));

  /* --------- Validaciones (fixes) --------- */
  const validate = () => {
    const e: FormErrors = {};
    if (!state.centroCostos) e.centroCostos = "Obligatorio";
    if (!state.co)          e.co           = "Obligatorio";
    if (!state.fecha)       e.fecha        = "Seleccione la fecha de emisión";
    if (state.lineas.length <= 0) e.lineas = "Ingrese al menos un artículo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* --------- Acciones que usan servicios internos --------- */
  const cargarProveedores = React.useCallback(() => svc.getProveedores(), [svc]);
  const cargarItems       = React.useCallback(() => svc.getItems(), [svc]);
  const crearItem         = React.useCallback((d:{descripcion:string;valor:number}) => svc.createItem(d), [svc]);

  const handleSubmit = React.useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await svc.saveInvoice(state);
      return res; 
    } finally {
      setSubmitting(false);
    }
  }, [state, svc]);

  return {state, errors, submitting, setField, setState, setErrors, cargarProveedores, cargarItems, crearItem, handleSubmit,};
}
