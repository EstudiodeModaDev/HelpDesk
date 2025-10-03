import * as React from "react";
import { useState, useRef } from "react";
import type { FormErrors } from "../Models/nuevoTicket";
import type { TicketsService } from "../Services/Tickets.service";
import type { FormReasignarState, Ticket } from "../Models/Tickets";
import type { UsuariosSPService } from "../Services/Usuarios.Service";
import type { GetAllOpts, Reasignar } from "../Models/Commons";

type Svc = {
  Tickets?: TicketsService;
  Usuarios: UsuariosSPService;
};

export class RecategorizarService {
  private flowUrl: string =
    "https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/d17c9915a48f4b0d8e8a1fa90f007ba8/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5uBiLoVQS7tiJ0i5xL13qMlBmzDSoee9kmAqcHTPIh0";
  constructor(flowUrl?: string) {
    if (flowUrl) this.flowUrl = flowUrl;
  }

  async sendTeamsToUserViaFlow(input: Reasignar): Promise<any> {
    return this.postToFlow({
      IDCandidato: input.IDCandidato,
      Nota: input.Nota ?? "",
      IDCaso: input.IDCaso ?? "",
      IDSolicitante: input.IDSolicitante,
    });
  }

  private async postToFlow(payload: any): Promise<any> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const res = await fetch(this.flowUrl, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Flow call failed: ${res.status} ${txt}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json().catch(() => ({})) : {};
  }
}

const escapeOData = (s: string) => String(s ?? "").replace(/'/g, "''");

export function useRecategorizarTicket(services: Svc, ticket: Ticket) {
  const { Usuarios } = services;

  const [state, setState] = useState<FormReasignarState>({ resolutor: null, Nota: " " });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // ✅ usa el tipo de estado correcto
  const setField = <K extends keyof FormReasignarState>(k: K, v: FormReasignarState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e: FormErrors = {};
    if (!state.resolutor) e.resolutor = "Seleccione un resolutor para reasignar";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const flowServiceRef = useRef<RecategorizarService | null>(null);
  if (!flowServiceRef.current) flowServiceRef.current = new RecategorizarService();

  const handleReasignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const candidatoMail = state.resolutor?.email?.trim();
      const solicitanteMail = ticket?.CorreoResolutor;

      if (!candidatoMail) throw new Error("No se proporcionó correo del candidato (resolutor).");
      if (!solicitanteMail) throw new Error("No se encontró correo del solicitante/resolutor previo en el ticket.");

      // Filtros OData
      const filterCandidato: GetAllOpts = {
        filter: `Correo eq '${escapeOData(candidatoMail)}'`,
        top: 1,
      };
      const filterSolicitante: GetAllOpts = {
        filter: `Correo eq '${escapeOData(solicitanteMail)}'`,
        top: 1,
      };

      const [candidatos, solicitantes] = await Promise.all([
        Usuarios.getAll(filterCandidato),
        Usuarios.getAll(filterSolicitante),
      ]);

      const candidato = candidatos?.[0];
      const solicitante = solicitantes?.[0];

      if (!candidato?.ID) throw new Error(`No se encontró candidato con correo ${candidatoMail}`);
      if (!solicitante?.ID) throw new Error(`No se encontró solicitante con correo ${solicitanteMail}`);

      // Llamada al Flow (await para capturar error)
      const payloadFlow: Reasignar = {
        IDCandidato: Number(candidato.ID),
        IDSolicitante: Number(solicitante.ID),
        IDCaso: Number(ticket.ID),
        Nota: state.Nota ?? "",
      };

      const resp = await flowServiceRef.current!.sendTeamsToUserViaFlow(payloadFlow);
      console.log("[Flow] Reasignación enviada:", resp);

      setState({ resolutor: null, Nota: " " });
      setErrors({});
    } catch (err) {
      console.error("Error en reasignación:", err);
      setErrors((prev) => ({ ...prev, general: (err as Error).message }));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    state,
    setField,
    errors,
    submitting,
    handleReasignar,
  };
}
