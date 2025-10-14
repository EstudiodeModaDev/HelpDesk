import * as React from "react";
import { useState, useMemo } from "react";
import type { Facturas, FormErrors, FacturasUx, ItemFactura, Proveedor, ItemBd, ItemUx, ItemsErrors, ProveedorError } from "../Models/Facturas";
import { useGraphServices } from "../graph/GrapServicesContext";
import { useAuth } from "../auth/authContext";
import type { ProveedoresFacturaService } from "../Services/ProveedoresFacturas.service";
import type { ItemService } from "../Services/Items.service";
import type { FacturasService } from "../Services/Facturas.service";
import type { ItemFacturaService } from "../Services/ItemsFacturas.service";
import { toGraphDateOnly, toISODateFlex } from "../utils/Date";
import type { GetAllOpts } from "../Models/Commons";
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

export function useVerFacturas(FacturasSvc: FacturasService) {
  const [rows, setRows] = React.useState<Facturas[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // fecha “YYYY-MM-DD”
  const today = React.useMemo(() => toISODateFlex(new Date()), []);

  // Si DateRange son strings ISO “YYYY-MM-DD”
  type DateRange = { from?: string; to?: string };

  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });

  // paginación servidor
  const [pageSize, setPageSize] = React.useState<number>(10); // $top
  const [pageIndex, setPageIndex] = React.useState<number>(1); // 1-based
  const [nextLink, setNextLink] = React.useState<string | null>(null);

  // ordenamiento
  type SortField = 'id' | 'FechaApertura' | 'TiempoSolucion' | 'Title' | 'resolutor';
  type SortDir = 'asc' | 'desc';

  const [sorts, setSorts] = React.useState<Array<{ field: SortField; dir: SortDir }>>([
    { field: 'id', dir: 'desc' },
  ]);

  // Mueve el mapa ARRIBA (o métele useMemo) para evitar TDZ
  const sortFieldToOData = React.useMemo<Record<SortField, string>>(
    () => ({
      id: 'id', // o 'fields/Created' si realmente quieres ordenar por created
      FechaApertura: 'fields/FechaApertura',
      TiempoSolucion: 'fields/TiempoSolucion',
      Title: 'fields/Title',
      resolutor: 'fields/Nombreresolutor',
    }),
    []
  );

  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];

    // Permite solo-from, solo-to o ambos
    if (range.from) filters.push(`fields/FechaApertura ge '${range.from}T00:00:00Z'`);
    if (range.to)   filters.push(`fields/FechaApertura le '${range.to}T23:59:59Z'`);

    const orderParts: string[] = sorts
      .map((s) => {
        const col = sortFieldToOData[s.field];
        return col ? `${col} ${s.dir}` : '';
      })
      .filter(Boolean);

    // asegúrate de tener siempre un tie-breaker
    if (!sorts.some((s) => s.field === 'id')) {
      orderParts.push('id desc');
    }

    return {
      filter: filters.join(' and '),
      orderby: orderParts.join(','),
      top: pageSize,
    };
  }, [range.from, range.to, pageSize, sorts, sortFieldToOData]);

  const loadFirstPage = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items, nextLink: n1 } = await FacturasSvc.getAll(buildFilter());
      setRows(items);
      setNextLink(n1 ?? null);
      setPageIndex(1);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando facturas');
      setRows([]);
      setNextLink(null);
      setPageIndex(1);
    } finally {
      setLoading(false);
    }
  }, [FacturasSvc, buildFilter]);

  React.useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const hasNext = !!nextLink;

  const nextPage = React.useCallback(async () => {
    if (!nextLink) return;
    setLoading(true);
    setError(null);
    try {
      const { items, nextLink: n2 } = await FacturasSvc.getByNextLink(nextLink);
      setRows(items);            // solo página actual (no acumulativo)
      setNextLink(n2 ?? null);
      setPageIndex((i) => i + 1);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando más facturas');
    } finally {
      setLoading(false);
    }
  }, [nextLink, FacturasSvc]);

  const applyRange = React.useCallback(() => {
    loadFirstPage(); // ya resetea pageIndex y nextLink
  }, [loadFirstPage]);

  const reloadAll = React.useCallback(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const toggleSort = React.useCallback((field: SortField, additive = false) => {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.field === field);
      if (!additive) {
        if (idx >= 0) {
          const dir: SortDir = prev[idx].dir === 'desc' ? 'asc' : 'desc';
          return [{ field, dir }];
        }
        return [{ field, dir: 'asc' }];
      }
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { field, dir: copy[idx].dir === 'desc' ? 'asc' : 'desc' };
        return copy;
      }
      return [...prev, { field, dir: 'asc' }];
    });
  }, []);

  return {
    rows,
    loading,
    error,

    // paginación
    pageSize,
    setPageSize, // al cambiar, buildFilter cambia y se recarga por el efecto
    pageIndex,
    hasNext,
    nextPage,

    // filtros
    range,
    setRange,
    applyRange,

    // acciones
    reloadAll,
    toggleSort,
    sorts,
  };
}
