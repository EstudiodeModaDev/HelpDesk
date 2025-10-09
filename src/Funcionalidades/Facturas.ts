import * as React from "react";
import { useState, useMemo } from "react";
import type { FormErrors, InvoiceLine, InvoicePayload, Item, Proveedor } from "../Models/Facturas";

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

export type FacturasServices = Partial<typeof defaultServices>;

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}


export function useFacturas(services?: FacturasServices) {
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
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    //Funciones necesarias para cargas
    const setField = <K extends keyof InvoicePayload>(k: K, v: InvoicePayload[K]) => setState(s => ({ ...s, [k]: v }));
    const cargarProveedores = React.useCallback(() => svc.getProveedores(), [svc]);
    const cargarItems       = React.useCallback(() => svc.getItems(), [svc]);

    React.useEffect(() => {
        (async () => {
        try {
            setLoadingData(true);
            const [pv, it] = await Promise.all([cargarProveedores(), cargarItems()]);
            setProveedores(pv);
            setItems(it);
        } catch (e: any) {
            setError(e?.message ?? "Error cargando datos");
        } finally {
            setLoadingData(false);
        }
        })();
    }, [cargarProveedores, cargarItems]);


    //Funciones para creaciones
    const validate = () => {
        const e: FormErrors = {};
        if (!state.centroCostos) e.centroCostos = "Obligatorio";
        if (!state.co)          e.co           = "Obligatorio";
        if (!state.fecha)       e.fecha        = "Seleccione la fecha de emisión";
        if (state.lineas.length <= 0) e.lineas = "Ingrese al menos un artículo";
        setErrors(e);
        return Object.keys(e).length === 0;
    };
    const crearItem         = React.useCallback((d:{descripcion:string;valor:number}) => svc.createItem(d), [svc]);
    
    const  addLinea = () => {setField("lineas", [...(state.lineas ?? []),
        {
            tempId: cryptoRandomId(),
            itemId: "",
            descripcion: undefined,
            valorUnitario: 0,
            cantidad: 1,
            subtotal: 0,
        } as InvoiceLine,
        ]);
    }

    const removeLinea = (tempId: string) => {setField("lineas", (state.lineas ?? []).filter((l) => l.tempId !== tempId));}

    //Funciones para calculos
    const total = useMemo(
        () => (state.lineas ?? []).reduce((acc, l) => acc + l.subtotal, 0),
        [state.lineas]
    );


    //Funciones para cambios de desplegables
    const onChangeItem = (tempId: string, itemId: string) => {
        const it = items.find((i) => i.Identificador === itemId);
        setField("lineas", (state.lineas ?? []).map((l) =>
            l.tempId === tempId
            ? {
                ...l,
                itemId,
                descripcion: it?.descripcion ?? "",
                valorUnitario: it?.valor ?? 0,
                subtotal: (it?.valor ?? 0) * (l.cantidad || 0),
                }
            : l
        )
        );
    }

    const onChangeCantidad = (tempId: string, cantidad: number) => {
        setField(
            "lineas",
            (state.lineas ?? []).map((l) =>
            l.tempId === tempId
                ? { ...l, cantidad, subtotal: (l.valorUnitario || 0) * (cantidad || 0) }
                : l
            )
        );
        }
        
    const onChangeValorUnitario = (tempId: string, valorUnitario: number) => {
    setField(
        "lineas",
        (state.lineas ?? []).map((l) =>
        l.tempId === tempId
            ? { ...l, valorUnitario, subtotal: (valorUnitario || 0) * (l.cantidad || 0) }
            : l
        )
    );
    }
    

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

  return {state, errors, submitting, proveedores, items, loadingData, error, total,
    setField, setState, setErrors, handleSubmit, crearItem, setItems, setError, addLinea, removeLinea, onChangeItem, onChangeCantidad, onChangeValorUnitario};
}
