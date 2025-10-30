import React from "react";
import type { AttachmentLite, } from "../Models/Tickets";
import { TicketsService } from "../Services/Tickets.service";

export function useTicketsAttachments(TicketsSvc: TicketsService, id: string) {
  const [rows, setRows] = React.useState<AttachmentLite[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadAttchments = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const attchments = await TicketsSvc.listAttachments_SP(Number(id));
      attchments.forEach(a => {
        console.log("[Attachments]", a.name, a.size, a.contentType,);
        
      });
      setRows(attchments);
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

