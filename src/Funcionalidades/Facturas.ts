import * as React from "react";
import { useState, useMemo } from "react";
import type { Facturas, FormErrors, FacturasUx, ItemFactura, Proveedor, ItemBd, ItemUx } from "../Models/Facturas";
import { useGraphServices } from "../graph/GrapServicesContext";
import { useAuth } from "../auth/authContext";
import type { ProveedoresFacturaService } from "../Services/ProveedoresFacturas.service";
import type { ItemService } from "../Services/Items.service";
import type { FacturasService } from "../Services/Facturas.service";
import type { ItemFacturaService } from "../Services/ItemsFacturas.service";
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function useFacturas() {
  const { account } = useAuth();
  const [state, setState] = useState<FacturasUx>({
      CO: "",
      FechaEmision: "",
      lineas: [],
      nit: "",
      NoFactura: "",
      IdProveedor: "",
      Total: 0,
      un: "",
      Title: account?.name!
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [items, setItems] = useState<ItemBd[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {Facturas: FacturasSvc, ItemFactura: ItemFacturaSvc, ProveedoresFactura: ProveedoresSvc, Item: ItemsSvc} = useGraphServices() as ReturnType<typeof useGraphServices> & {
      Facturas: FacturasService;
      ItemFactura: ItemFacturaService;
      ProveedoresFactura: ProveedoresFacturaService;
      Item: ItemService
  };

  const setField = <K extends keyof FacturasUx>(k: K, v: FacturasUx[K]) => setState(s => ({ ...s, [k]: v }));

  React.useEffect(() => {
      (async () => {
      try {
          setLoadingData(true);
          const proveedores = await ProveedoresSvc.getAll()
          const items = await ItemsSvc.getAll()
          setProveedores(proveedores);
          setItems(items);
      } catch (e: any) {
          setError(e?.message ?? "Error cargando datos");
      } finally {
          setLoadingData(false);
      }
      })();
  }, [ProveedoresSvc, ItemsSvc]);


  const validate = () => {
      const e: FormErrors = {};
      if (!state.CO) e.CO = "Obligatorio";
      if (!state.FechaEmision)        e.FechaEmision       = "Obligatorio";
      if (!state.IdProveedor)         e.IdProveedor        = "Seleccione el proveedor";
      if (!state.NoFactura)           e.NoFactura          = "Ingrese el numero de factura";
      if (!state.Title)               e.Title       = "Seleccione el proveedor";
      if (state.lineas.length <= 0)   e.lineas = "Ingrese al menos un artículo";
      setErrors(e);
      return Object.keys(e).length === 0;
  };
    
  const  addLinea = () => {setField("lineas", [...(state.lineas ?? []),
      {
        cantidad: 1,
        NombreItem: "",
        subtotal: 0,
        tempId: cryptoRandomId(),
        Title: "",
        Valor: 0,
      } as ItemUx,
      ]);
  }

  const removeLinea = (tempId: string) => {setField("lineas", (state.lineas ?? []).filter((l) => l.tempId !== tempId));}

  const total = useMemo(
      () => (state.lineas ?? []).reduce((acc, l) => acc + l.subtotal!, 0),
      [state.lineas]
  );

  //Funciones para cambios de desplegables
  const onChangeItem = (tempId: string, itemId: string) => {
    const it = items.find((i) => i.Title === itemId);
    setField("lineas", (state.lineas ?? []).map((l) =>
        l.tempId === tempId
        ? {
            ...l,
            itemId,
            descripcion: it?.NombreItem ?? "",
            valorUnitario: it?.Valor ?? 0,
            subtotal: (Number(it?.Valor ?? 0) * (l.cantidad || 0)),

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
            ? { ...l, cantidad, subtotal: (l.Valor || 0) * (cantidad || 0) }
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
  
  //Funciones para incersiones en bases de datos
  const handleSubmit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(async (e) => {
    e?.preventDefault?.();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const facturaPayload: Facturas = {
        CO: state.CO?.trim() ?? "",
        FechaEmision: state.FechaEmision,
        IdProveedor: state.IdProveedor!,
        NoFactura: String(state.NoFactura ?? "").trim(),
        Title: account?.name ?? "",
        Total: Number((state.Total ?? 0).toFixed(2)),
        un: state.un ?? "",
      };

      const factura = await FacturasSvc.create(facturaPayload);
      if (!factura?.Id) throw new Error("No se obtuvo Id de la factura guardada.");

      const detalle: ItemFactura[] = (state.lineas ?? []).map((ln) => ({
        // En tu esquema ItemFactura.Title = IdItem (yo pasaré el código del ítem)
        Title: ln.Title?.trim() ?? "",        // ⬅️ ANTES usabas ln.Id (vacío)
        IdFactura: factura.Id!,
        Cantidad: ln.cantidad ?? 0,
      }));

      await Promise.all(detalle.map((d) => ItemFacturaSvc.create(d)));

      // opcional: limpiar/avisar
      // setState(s => ({ ...s, lineas: [], Total: 0 }));
      console.log("Factura guardada", factura);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  }, [state, account, validate, FacturasSvc, ItemFacturaSvc]);


  return {state, errors, submitting, proveedores, items, loadingData, error, total,
    setField, setState, setErrors, handleSubmit, setItems, setError, addLinea, removeLinea, onChangeItem, onChangeCantidad, onChangeValorUnitario};
}

