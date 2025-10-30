import React from "react";
import type { AttachmentLite, } from "../Models/Tickets";
import { TicketsService } from "../Services/Tickets.service";
import { FlowClient } from "./FlowClient";

export function useTicketsAttachments(TicketsSvc: TicketsService, id: string) {
  const [rows, setRows] = React.useState<AttachmentLite[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
   const notifyFlow = new FlowClient("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ceb573986da649129d18d563480129eb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=FSUJmCm8sGHZGVlNA6xD1bRyn2gFiIVXmsW53CbDAHM")

  const loadAttchments = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const attachments = notifyFlow.invoke({itemId: Number(id)})
      console.log(attachments)
      
    } catch (e: any) {
      setError(e?.message ?? "Error cargando adjuntos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [TicketsSvc, id]);


  React.useEffect(() => {
    loadAttchments();
  }, [loadAttchments]);


  return {
    rows, loading, error,
    loadAttchments
  };
}

