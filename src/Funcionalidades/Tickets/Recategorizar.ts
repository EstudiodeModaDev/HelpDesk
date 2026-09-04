import * as React from "react";
import { useState, useEffect } from "react";
import { calcularFechaSolucion, calculoANS } from "../../utils/ans";
import { fetchHolidays } from "../../Services/Festivos";
import type { FormErrors } from "../../Models/nuevoTicket";
import type { TZDate } from "@date-fns/tz";
import { toGraphDateTime /* o toUtcIso */ } from "../../utils/Date";
import type { FormRecategorizarState, Ticket } from "../../Models/Tickets";
import type { TicketsRepository } from "../../repositories/TicketsRepository/TicketRepository";
import toast from "react-hot-toast";
import { notifySolicitanteCategoryChange } from "./utils/notifications";
import type { SupabaseTickets } from "../../Models/DTO/Tickets";
import type { Holiday } from "../../Models/Holiday";
import type { ANSRepository } from "../../repositories/AnsRepository/AnsRepository";
import { horasPorANS } from "./utils/ticketConstants";
import { useCatalogoServicio } from "./hooks/useCatalogoServicio";

type Svc = {
  Categorias: { getAll: (opts?: any) => Promise<any[]> };
  SubCategorias: { getAll: (opts?: any) => Promise<any[]> };
  Articulos: { getAll: (opts?: any) => Promise<any[]> };
  Tickets?: TicketsRepository;
  Ans: ANSRepository
};

export function useRecategorizarTicket(services: Svc, ticket: Ticket) {
  const { Categorias, SubCategorias, Articulos, Tickets, Ans } = services;

  const [state, setState] = useState<FormRecategorizarState>({
    categoria: "",
    subcategoria: "",
    articulo: "",
    articuloId: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const { categorias, subcategoriasAll, articulosAll, loadingCatalogos, errorCatalogos } =
    useCatalogoServicio({ Categorias, SubCategorias, Articulos });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [fechaSolucion, setFechaSolucion] = useState<Date | null>(null); // inicia en null

  // Festivos
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const hs = await fetchHolidays();
        if (!cancel) setHolidays(hs);
      } catch (e) {
        if (!cancel) console.error("Error festivos:", e);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // setField: usar el tipo correcto del state de este hook
  const setField = <K extends keyof FormRecategorizarState>(k: K, v: FormRecategorizarState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e: FormErrors = {};
    if (!state.categoria) e.categoria = "Seleccione una categoría";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRecategorizar = async (e: React.FormEvent, ANSprops: {catId: number | null, subId: number | null, artId: number | null}): Promise<boolean> => {
    e.preventDefault();
    if (!validate()) return false;

    setSubmitting(true);
    try {
      const apertura = ticket.FechaApertura ? new Date(ticket.FechaApertura) : new Date();

      const ans = await calculoANS({art: ANSprops.artId, catId: ANSprops.catId, subId: ANSprops.subId}, Ans);
      const horasAns = horasPorANS[ans] ?? 0;

      let solucionTZ: TZDate | null = null;
      if (horasAns > 0) {
        solucionTZ = calcularFechaSolucion(apertura, horasAns, holidays); 
      }

      // Convierte TZDate -> Date normal
      const solucionDate = solucionTZ ? new Date(solucionTZ as unknown as string) : null;
      setFechaSolucion(solucionDate);
      const tiempoSolISO = solucionDate ? toGraphDateTime(solucionDate) : null;
      const payloadUpdate: Partial<SupabaseTickets> = {
        ticket_solvi_categoria: state.categoria,
        ticket_solvi_subcategoria: state.subcategoria,
        ticket_solvi_articulo: state.articulo,
        ticket_solvi_ans: ans,
        ...(tiempoSolISO ? { ticket_solvi_fechamaxima: tiempoSolISO } : {}), // solo si existe
      };

      if (!Tickets?.updateTicket) {
        toast.error("Tickets service no disponible. Verifica el GraphServicesProvider.")
        throw new Error("Tickets service no disponible. Verifica el GraphServicesProvider.")
      } 

      await Tickets.updateTicket(String(ticket.ID), payloadUpdate);

      const solicitanteEmail = ticket.CorreoSolicitante;


      if (solicitanteEmail) {
        await notifySolicitanteCategoryChange(ticket, {Articulo: state.articulo, Categoria: state.categoria, SubCategoria: state.subcategoria})
      }

      // Limpiar formulario
      setState({ categoria: "", subcategoria: "", articulo: "", articuloId: "" });
      setErrors({});
      return true
  
    } finally {
      setSubmitting(false);
    }
  };

  return {
    state,
    setField,
    errors,
    submitting,
    fechaSolucion,
    categorias,
    subcategoriasAll,
    articulosAll,
    loadingCatalogos,
    errorCatalogos,
    handleRecategorizar,
  };
}
