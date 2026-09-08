import * as React from "react";
import type { MasiveFlow } from "../../../Models/FlujosPA";
import { fileToBasePA64 } from "../../../utils/Commons";
import { FlowClient } from "../../shared/FlowClient";
import type { TicketsRepository } from "../../../repositories/TicketsRepository/TicketRepository";
import { importTicketsFromExcel } from "../utils/importTicketsFromExcel";
import toast from "react-hot-toast";
import type { Ticket } from "../../../Models/Tickets";
import { notifyTicketPausedSolicitante, notifyTicketResumedSolicitante } from "../utils/notifications";

const FLOW_URL =
  "https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c6d30061fb55449798cbdb76da3172e5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=n-NqCPMlsQaZ9PDJyG6f9hLmkTtHvRjybLqc9Ilk8eM";

type UseTicketActionsParams = {
  TicketsSvc: TicketsRepository;
  onTicketsChanged?: () => Promise<void> | void;
  onFileSent?: () => void;
};

export function useTicketActions({
  TicketsSvc,
  onTicketsChanged,
  onFileSent,
}: UseTicketActionsParams) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const notifyFlow = React.useMemo(() => new FlowClient(FLOW_URL), []);

  const handleCreateRelation = React.useCallback(
    async (actualId: string | number, relatedId: string | number, type: string) => {
      setLoading(true);
      setError(null);

      try {
        if (type === "padre") {
          await TicketsSvc.updateTicket(String(actualId), { ticket_solvi_id_casopadre: String(relatedId) });
        } else if (type === "hijo") {
          await TicketsSvc.updateTicket(String(relatedId), { ticket_solvi_id_casopadre: String(actualId) });
        } else {
          throw new Error("Relación 'masiva' aún no implementada");
        }

        await onTicketsChanged?.();
        return true;
      } catch (actionError: any) {
        setError(actionError?.message ?? "Error actualizando relación del ticket");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [TicketsSvc, onTicketsChanged]
  );

  const updateSelectedTicket = React.useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        return await TicketsSvc.getTicketById(id);
      } catch (actionError: any) {
        setError(actionError?.message ?? "Error cargando ticket");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [TicketsSvc]
  );

  const sendFileToSupabase = React.useCallback(
    async (file: File, uploader?: string) => {
      const contentBase64 = await fileToBasePA64(file);

      const payload = {
        uploader: uploader ?? "",
        file: {
          name: file.name,
          contentType: file.type || "application/octet-stream",
          contentBase64,
        },
      };

      setLoading(true);
      setError(null);

      try {
        await notifyFlow.invoke<MasiveFlow, any>({ file: payload.file });
        onFileSent?.();
      } catch (actionError: any) {
        setError(actionError?.message ?? "Error enviando archivo al flujo");
        throw actionError;
      } finally {
        setLoading(false);
      }
    },
    [notifyFlow, onFileSent]
  );

  const uploadMasiva = React.useCallback(async (file: File) => {
    try{
      await toast.promise(
        importTicketsFromExcel({file, TicketsSvc}),
        {
          loading: "Creando tickets desde el Excel...",
          success: (data) => {
            const skipped = data.errors.length
              ? ` Se omitieron ${data.errors.length} fila(s).`
              : "";
            return `Se crearon ${data.created} ticket(s).${skipped}`;
          },
          error: (err) => err?.message ?? "Ocurrio un error al procesar el Excel.",
        }
      );
    }catch(e: any){
      throw new Error("Algo ha salido mal ", e)
    }
  }, [TicketsSvc]);

  const pauseTicket = React.useCallback(async (ticket: Ticket, motivo: string): Promise<{ok: boolean, message?: string}> => {
    if (!ticket.ID) {
      return {ok: false, message: "Ticket inválido."};
    }

    const updated = await TicketsSvc.updateTicket(String(ticket.ID), {
      ticket_solvi_estado: "Pausado",
      ticket_solvi_fecha_pausa: new Date().toISOString(),
    });

    if (!updated.status) {
      return {ok: false, message: updated.message ?? "Error al pausar el ticket."};
    }

    if (ticket.CorreoSolicitante) {
      try {
        await notifyTicketPausedSolicitante(ticket, motivo);
      } catch (notifyError) {
        console.error("Error notificando la pausa del ticket:", notifyError);
      }
    }

    await onTicketsChanged?.();
    return {ok: true};
  }, [TicketsSvc, onTicketsChanged]);

  const resumeTicket = React.useCallback(async (ticket: Ticket): Promise<{ok: boolean, message?: string}> => {
    if (!ticket.ID) {
      return {ok: false, message: "Ticket inválido."};
    }

    const current = await TicketsSvc.getTicketById(String(ticket.ID));

    if (!current.status || !current.data) {
      return {ok: false, message: current.message ?? "No se pudo cargar el ticket."};
    }

    if (!current.data.FechaPausa) {
      return {ok: false, message: "El ticket no está pausado."};
    }

    const elapsedMs = Date.now() - new Date(current.data.FechaPausa).getTime();
    const nuevaFechaMaxima = current.data.FechaMaxima
      ? new Date(new Date(current.data.FechaMaxima).getTime() + elapsedMs).toISOString()
      : undefined;

    const updated = await TicketsSvc.updateTicket(String(ticket.ID), {
      ticket_solvi_estado: "En Atención",
      ticket_solvi_fecha_pausa: null,
      ...(nuevaFechaMaxima ? {ticket_solvi_fechamaxima: nuevaFechaMaxima} : {}),
    });

    if (!updated.status) {
      return {ok: false, message: updated.message ?? "Error al reanudar el ticket."};
    }

    if (current.data.CorreoSolicitante) {
      try {
        await notifyTicketResumedSolicitante(current.data, elapsedMs, nuevaFechaMaxima);
      } catch (notifyError) {
        console.error("Error notificando la reanudación del ticket:", notifyError);
      }
    }

    await onTicketsChanged?.();
    return {ok: true};
  }, [TicketsSvc, onTicketsChanged]);


  return {
    loading,
    error,
    handleCreateRelation,
    updateSelectedTicket,
    sendFileToSupabase,
    uploadMasiva,
    pauseTicket,
    resumeTicket,
  };
}
