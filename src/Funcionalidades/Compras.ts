import React from "react";

import type { DateRange } from "../Models/Filtros";
import { toGraphDateTime, toISODateFlex, toISODateTimeFlex } from "../utils/Date";
import type { GetAllOpts } from "../Models/Commons";
import type { ComprasService } from "../Services/Compras.service";
import type { Compra, comprasState } from "../Models/Compras";
import type { CentroCostos } from "../Models/CentroCostos";
import type { CentroCostosService } from "../Services/CentroCostos.service";
import type { COService } from "../Services/COCostos.service";
import type { Ticket } from "../Models/Tickets";
import { calcularFechaSolucion } from "../utils/ans";
import { fetchHolidays } from "../Services/Festivos";
import type { Holiday } from "festivos-colombianos";
import type { Log } from "../Models/Log";
import type { TicketsService } from "../Services/Tickets.service";
import type { LogService } from "../Services/Log.service";

export function useCompras(ComprasSvc: ComprasService, TicketsSvc: TicketsService, LogSvc: LogService) {

  const MARCAS = ["MFG", "DIESEL", "PILATOS", "SUPERDRY", "KIPLING", "BROKEN CHAINS"] as const;
  const NEXT: Record<string, string> = {
    "Pendiente por orden de compra": "Pendiente por entrega de proveedor",
    "Pendiente por entrega de proveedor": "Pendiente por registro de inventario",
    "Pendiente por registro de inventario": "Pendiente por entrega al usuario",
    "Pendiente por entrega al usuario": "Pendiente por registro de factura",
    "Pendiente por registro de factura": "Completado"
  };
  type Marca = typeof MARCAS[number];
  const zeroMarcas = (): Record<Marca, number> => MARCAS.reduce((acc, m) => { acc[m] = 0; return acc; }, {} as Record<Marca, number>);

  const [rows, setRows] = React.useState<Compra[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const today = React.useMemo(() => toISODateFlex(new Date()), []);
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });
  const [pageSize, setPageSize] = React.useState<number>(10); // = $top
  const [pageIndex, setPageIndex] = React.useState<number>(1); // 1-based
  const [nextLink, setNextLink] = React.useState<string | null>(null);
  const [state, setState] = React.useState<comprasState>({
    tipoCompra: "Producto",
    productoServicio: "",
    solicitadoPor: "",
    solicitadoPorCorreo: "",
    fechaSolicitud: new Date().toISOString().slice(0, 10),
    dispositivo: "",
    co: null,         
    un: "",
    ccosto: null,
    cargarA: "CO",
    noCO: "",
    marcasPct: { ...zeroMarcas() },
    motivo: "",
    codigoItem: "",
    DescItem: ""
  });
  const [saving, setSaving] = React.useState(false)
  const [holidays, setHolidays] = React.useState<Holiday[]>([])

  //HELPERS
  const totalPct = React.useMemo( () => state.cargarA === "Marca" ? 
    (Object.values(state.marcasPct).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) || 0)
    : 0, [state.cargarA, state.marcasPct]);

  function setField<K extends keyof comprasState>(k: K, v: comprasState[K]) {setState((s) => ({ ...s, [k]: v }));}

  function setMarcaPct(m: Marca, v: number) {setState((s) => ({ ...s, marcasPct: { ...s.marcasPct, [m]: v } }))}

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!state.productoServicio.trim()) e.productoServicio = "Requerido.";
    if (!state.solicitadoPor.trim())   e.solicitadoPor   = "Requerido.";
    if (!state.fechaSolicitud)          e.fechaSolicitud  = "Requerido.";
    if (!state.co)                      e.co              = "Seleccione CO.";
    if (!state.un)                      e.un              = "Seleccione UN.";
    if (!state.ccosto)                  e.ccosto          = "Seleccione C. Costo.";
    if (state.cargarA === "Marca" && totalPct !== 100)
      e.marcasPct = "El total de porcentajes debe ser 100%.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Carga de festivos inicial
  React.useEffect(() => {
      let cancel = false;
      (async () => {
        try {
          const hs = await fetchHolidays();
          if (!cancel) setHolidays(hs);
        } catch (e) {
          if (!cancel) console.error("Error festivos:", e);
        }
      })();
      return () => {
        cancel = true;
      };
    }, []);
  
  
  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const compra = ComprasSvc.create({
      CargarA: state.cargarA, 
      CCosto: state.ccosto?.value ?? "", 
      CO: state.co?.value ?? "", 
      Dispositivo: state.productoServicio, 
      FechaSolicitud: state.fechaSolicitud,
      PorcentajeBroken: String(state.marcasPct["BROKEN CHAINS"]) ?? "0",
      PorcentajeDiesel: String(state.marcasPct["DIESEL"]) ?? "0",
      PorcentajeKipling: String(state.marcasPct["KIPLING"]) ?? "0",
      PorcentajeMFG: String(state.marcasPct["MFG"] ?? "0"),
      PorcentajePilatos: String(state.marcasPct["PILATOS"] ?? "0"),
      PorcentajeSuperdry: String(state.marcasPct["SUPERDRY"] ?? "0"),
      SolicitadoPor: state.solicitadoPor,
      Title: state.tipoCompra,
      UN: state.un,
      DescItem: "",
      CodigoItem: ""
    })

    const ticketpayload: Ticket = {
      ANS: "ANS 5",
      TiempoSolucion: toGraphDateTime(calcularFechaSolucion(new Date(), 240, holidays)),
      Categoria: state.tipoCompra === "Alquiler" ? "Alquiler" : "Compra",
      SubCategoria: state.productoServicio,
      CorreoResolutor: "cesanchez@estudiodemoda.com.co",
      Descripcion: `Se ha solicitado una compra del siguiente dispositivo:  ${state.productoServicio} por: ${state.solicitadoPor}`,

      Estadodesolicitud: "En Atención",
      FechaApertura: toISODateTimeFlex(String(new Date())),
      Fuente: "Self service",
      IdResolutor: "83",
      Nombreresolutor: "Cesar Eduardo Sanchez Salazar",
      Solicitante: state.solicitadoPor,
      CorreoSolicitante: "",

    }

    const createdTicket = await TicketsSvc.create(ticketpayload)

    const logpayload: Log = {
      Actor: "Sistema",
      Descripcion: state.tipoCompra === "Alquiler" ? 
        `Se ha creado un ticket bajo concepto de alquiler del siguiente dispositivo:  ${state.dispositivo} por solicitud de ${state.solicitadoPor}` :
        `Se ha creado un ticket bajo concepto de compra:  ${state.dispositivo} por solicitud de ${state.solicitadoPor}`,
      CorreoActor: "",
      Tipo_de_accion: "Creacion",
      Title: createdTicket.ID ?? ""
    }

    const createdLog = await LogSvc.create(logpayload)

    console.log(createdLog)
    
    alert("Se ha creado la solicitud de compra con éxito")
    console.log(compra)
    setState({productoServicio: "", cargarA: "CO", solicitadoPor: "", motivo: "", fechaSolicitud: "", tipoCompra: "Producto", dispositivo: "", noCO: "", marcasPct: { ...zeroMarcas() }, co: null, ccosto: null, un: "", solicitadoPorCorreo: "", codigoItem: "", DescItem: ""})  }, 
    [state, ComprasSvc, holidays]
  ); 
  
  const buildFilter = React.useCallback((): GetAllOpts => {
    const filters: string[] = [];

    if (range.from && range.to && (range.from < range.to)) {
      if (range.from) filters.push(`fields/FechaApertura ge '${range.from}T00:00:00Z'`);
      if (range.to)   filters.push(`fields/FechaApertura le '${range.to}T23:59:59Z'`);
    }
    return {
      filter: filters.join(" and "),
      top: pageSize,
    };
  }, [range.from, range.to, pageSize, ]); 

  const loadFirstPage = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { items, nextLink } = await ComprasSvc.getAll(buildFilter()); 
      setRows(items);
      setNextLink(nextLink ?? null);
      setPageIndex(1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando tickets");
      setRows([]);
      setNextLink(null);
      setPageIndex(1);
    } finally {
      setLoading(false);
    }
  }, [ComprasSvc, buildFilter]);

  const handleNext = React.useCallback(async (idItem: string) => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
     
      const current = await ComprasSvc.get(idItem); 
      const prev = (current.Estado) ?? "";
      const next = NEXT[prev];

      // 2) Si ya está en terminal, no hay nada que hacer
      if (prev === next) {
        setSaving(false);
        return;
      }

      try {
        const updated = await ComprasSvc.update(idItem, { Estado: next },        );
        alert(`Se ha actualizado el registro con el siguiente estado: ${updated?.Estado ?? "—"}`)
        reloadAll()

      } catch (e: any) {
        const code = e?.status ?? e?.code ?? e?.response?.status;
        if (code === 409 || code === 412) {
          const fresh = await ComprasSvc.get(idItem);
          const freshPrev = (fresh.Estado ) ?? "";
          const freshNext = NEXT[freshPrev];

          if (freshPrev === freshNext) {
            setField?.("estado", freshPrev);
            setSaving(false);
            return;
          }

          // Segundo intento con el ETag más reciente
          await ComprasSvc.update(
            idItem,
            { Estado: freshNext },
          );
          setField?.("estado", freshNext);
        } else {
          throw e;
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "No se pudo avanzar el estado");
    } finally {
      setSaving(false);
    }
  }, [ComprasSvc, setField, saving]);


  React.useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const hasNext = !!nextLink;

  const nextPage = React.useCallback(async () => {
    if (!nextLink) return;
    setLoading(true); setError(null);
    try {
      const { items, nextLink: n2 } = await ComprasSvc.getByNextLink(nextLink);
      setRows(items);              // 👈 reemplaza la página visible
      setNextLink(n2 ?? null);     // null si no hay más
      setPageIndex(i => i + 1);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando más tickets");
    } finally {
      setLoading(false);
    }
  }, [nextLink, ComprasSvc]);

  const applyRange = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);
  const reloadAll  = React.useCallback(() => { loadFirstPage(); }, [loadFirstPage]);

  return {
    rows, loading, error, MARCAS, pageSize,  pageIndex, hasNext, errors, state, range, totalPct,
    setPageSize, nextPage, setRange, applyRange, reloadAll, setField, setMarcaPct, setState, zeroMarcas, handleSubmit, handleNext
  };
}

export function useCentroCostos(CCSvc: CentroCostosService) {
  const [CC, setCC] = React.useState<CentroCostos[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadCC = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await CCSvc.getAll();

      setCC(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando centros de costo");
      setCC([]);
    } finally {
      setLoading(false);
    }
  }, [CCSvc]);

  React.useEffect(() => {
    loadCC();
  }, [loadCC]);

  const ccOptions = React.useMemo(
    () => CC.map(c => ({ value: c.Codigo, label: c.Title })),
    [CC]
  );

  return {
    CC, ccOptions, loading, error,
    reload: loadCC,
  };
}

export function useCO(COSvc: COService) {
  const [CentrosOperativos, setCO] = React.useState<CentroCostos[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const LoadCentroOperativos = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await COSvc.getAll();

      setCO(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando centros de costo");
      setCO([]);
    } finally {
      setLoading(false);
    }
  }, [COSvc]);

  React.useEffect(() => {
    LoadCentroOperativos();
  }, [LoadCentroOperativos]);

  const COOptions = React.useMemo(
    () => CentrosOperativos.map(c => ({ value: c.Codigo, label: c.Title })),
    [CentrosOperativos]
  );

  return {
    CentrosOperativos, COOptions, loading, error,
    reload: LoadCentroOperativos,
  };
}


