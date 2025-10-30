import React from "react";
import type { AttachmentLite, } from "../Models/Tickets";
import { FlowClient } from "./FlowClient";

export function useTicketsAttachments(id: string) {
  const [rows, setRows] = React.useState<AttachmentLite[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
   const notifyFlow = new FlowClient("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ceb573986da649129d18d563480129eb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=FSUJmCm8sGHZGVlNA6xD1bRyn2gFiIVXmsW53CbDAHM")

  const loadAttachments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notifyFlow.invoke<any, any>({ itemId: Number(id) });

      if (!res?.ok) {
        throw new Error(res?.message ?? "No fue posible obtener los adjuntos");
      }
      setRows(res.items);               // <- tu estado de rows
    } catch (e: any) {
      setRows([]);
      setError(e?.message ?? "Error cargando adjuntos");
    } finally {
      setLoading(false);
    }
  }, [id, notifyFlow]); 


  React.useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);


  return {
    rows, loading, error,
    loadAttachments
  };
}

