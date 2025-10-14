import * as React from "react";
import { useState, useMemo } from "react";
import type { Facturas, FormErrors, FacturasUx, ItemFactura, Proveedor, ItemBd, ItemUx, ItemsErrors, ProveedorError } from "../Models/Facturas";
import { useGraphServices } from "../graph/GrapServicesContext";
import { useAuth } from "../auth/authContext";
import type { ProveedoresFacturaService } from "../Services/ProveedoresFacturas.service";
import type { ItemService } from "../Services/Items.service";
import type { FacturasService } from "../Services/Facturas.service";
import type { ItemFacturaService } from "../Services/ItemsFacturas.service";
import { toGraphDateOnly } from "../utils/Date";
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
  const [Itemsstate, setItemsState] = useState<ItemBd>({
    NombreItem: "",
    Title: "",
    Valor: 0
  });
  const [ProveedorState, setProveedorState] = useState<Proveedor>({
    Nit: "",
    Title: ""
  });
  const [ProveedorError, setProveedorErrors] = useState<ProveedorError>({});
  const [Itemserrors, setItemsErrors] = useState<ItemsErrors>({});
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
  const setItemsField = <K extends keyof ItemBd>(k: K, v: ItemBd[K]) => setItemsState(s => ({ ...s, [k]: v }));
  const setProveedoresField = <K extends keyof Proveedor>(k: K, v: Proveedor[K]) => setProveedorState(s => ({ ...s, [k]: v }));

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

  const validateItems = () => {
    const e: ItemsErrors = {};
    if (!Itemsstate.NombreItem) e.NombreItem = "Obligatorio";
    if (!Itemsstate.Title)      e.Title      = "Obligatorio";
    if (!Itemsstate.Valor)      e.Valor      = "Obligatorio";
    setItemsErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateProveedores = () => {
    const e: ProveedorError = {};
    if (!ProveedorState.Title) e.Title = "Obligatorio";
    if (!ProveedorState.Nit)   e.Nit   = "Obligatorio";
    setProveedorErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitItems = React.useCallback(async (): Promise<ItemBd> => {
    // valida con tus Itemsstate / validateItems
    if (!validateItems()) throw new Error("Item inválido");

    const payload: ItemBd = {
      Title: Itemsstate.Title.trim(),
      NombreItem: Itemsstate.NombreItem.trim(),
      Valor: Number(Itemsstate.Valor),
    };

    setSubmitting(true);
    setError(null);
    try {
      const created = await ItemsSvc.create(payload);
      // refrescar caches locales si quieres
      setItems(prev => [created, ...prev]);
      // limpiar formulario local del modal
      setItemsState({ Title: "", NombreItem: "", Valor: 0 });
      return created;
    } finally {
      setSubmitting(false);
    }
  }, [Itemsstate, ItemsSvc, validateItems, setItems, setItemsState, setSubmitting]);

  const handleSubmitProveedor = React.useCallback(async (): Promise<Proveedor> => {
    if (!validateProveedores()) throw new Error("Item inválido");

    const payload: Proveedor = {
      Title: ProveedorState.Title.trim(),
      Nit: ProveedorState.Nit.trim(),
    };

    setSubmitting(true); setError(null);
    try {
      const created = await ProveedoresSvc.create(payload);
      setProveedores(prev => [created, ...prev]);
      setProveedorState({ Title: "", Nit: "" });
      return created;
    } finally {
      setSubmitting(false);
    }
  }, [ProveedorState, ProveedoresSvc, validateProveedores, setProveedores, setProveedorState, setSubmitting]);

      
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
    const it = items.find((i) => i.Id === itemId);
    setField("lineas", (state.lineas ?? []).map((l) =>
        l.tempId === tempId
        ? {
            ...l,
            itemId,                          
            Title: it?.Title ?? "",          
            NombreItem: it?.NombreItem ?? "",
            Valor: Number(it?.Valor ?? 0),  
            subtotal: Number(it?.Valor ?? 0) * (l.cantidad || 0),
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
        FechaEmision: toGraphDateOnly(state.FechaEmision) ?? "",
        IdProveedor: state.IdProveedor!,
        NoFactura: String(state.NoFactura ?? "").trim(),
        Title: account?.name ?? "",
        Total: String((state.Total ?? 0).toFixed(2)),
        un: state.un ?? "",
      };

      const factura = await FacturasSvc.create(facturaPayload);
      if (!factura?.Id) throw new Error("No se obtuvo Id de la factura guardada.");

      const detalle: ItemFactura[] = (state.lineas ?? []).map((ln) => ({
        Title: ln.Id?.trim() ?? "",       
        IdFactura: factura.Id!,
        Cantidad: String(ln.cantidad ?? 0),
      }));

      await Promise.all(detalle.map((d) => {ItemFacturaSvc.create(d)}));

      setState({ CO: "", FechaEmision: "", IdProveedor: "", nit: "", NoFactura: "", Title: "", un: "", lineas: [], Total: 0 });
      console.log("Factura guardada", factura);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  }, [state, account, validate, FacturasSvc, ItemFacturaSvc]);


  return {state, errors, submitting, proveedores, items, loadingData, error, total, Itemsstate, Itemserrors, ProveedorError, ProveedorState,
    setField, setState, setErrors, handleSubmit, setItems, setError, addLinea, removeLinea, onChangeItem, onChangeCantidad, onChangeValorUnitario, handleSubmitItems, setItemsField, 
    handleSubmitProveedor, setProveedorState, setProveedoresField};
}
