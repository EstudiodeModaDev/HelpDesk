import * as React from "react";
import { useState } from "react";
import type { FormErrors } from "../Models/nuevoTicket";
import type { TicketsService } from "../Services/Tickets.service";
import { toGraphDateTime } from "../utils/Date";
import type { UsuariosSPService } from "../Services/Usuarios.Service";
import type { FlowToSP, FormErrorsCajeros, FormStateCajeros } from "../Models/FlujosPA";
import { FlowClient } from "./FlowClient";

type Svc = {
  Tickets?: TicketsService;
  Usuarios: UsuariosSPService;
};

// Helpers
export const first = (...vals: any[]) =>
  vals.find((v) => v !== undefined && v !== null && v !== "");

export function useCajerosPOS(services: Svc) {
  const { Tickets } = services;

  const [state, setState] = useState<FormStateCajeros>({
    Cedula: "",
    CO: "",
    Compañia: "",
    CorreoTercero: "",
    resolutor: null,
    solicitante: null,
    usuario: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Instancia del Flow
  const flowCajerosPos = React.useMemo(
    () =>
      new FlowClient(
        "https://<TU-ENV>/powerautomate/automations/direct/workflows/<id>/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=<sig>"
      ),
    []
  );

  const setField = <K extends keyof FormStateCajeros>(k: K, v: FormStateCajeros[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e: FormErrorsCajeros = {};
    if (!state.solicitante) e.solicitante = "Requerido";
    if (!state.resolutor) e.resolutor = "Requerido";
    if (!state.CO) e.CO = "Por favor digite un CO";
    if (!state.Cedula) e.Cedula = "Por favor una cédula";
    if (!state.Compañia.trim()) e.Compañia = "Por favor seleccione una compañía";

    setErrors(e as unknown as FormErrors);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {

      // 1) Crear ticket en la lista
      const payloadTicket = {
        Title: `Creación de usuario POS para ${state.solicitante?.label ?? ""}`,
        Descripcion: `Se ha creado un usuario POS para ${state.solicitante?.label ?? ""}, se enviarán las credenciales de forma interna`,
        FechaApertura: toGraphDateTime(new Date()),
        TiempoSolucion: toGraphDateTime(new Date()),
        Fuente: "Correo",
        Categoria: "Siesa",
        SubCategoria: "POS",
        SubSubCategoria: "Creacion de usuario nuevo",
        Nombreresolutor: "Automatizaciones",
        Solicitante: state.solicitante?.label,
        CorreoSolicitante: state.solicitante?.email,
        Estadodesolicitud: "Cerrado",
        ANS: "ANS 3",
      };

      let createdId: string | number = "";
      if (!Tickets?.create) {
        console.error("Tickets service no disponible. Verifica el GraphServicesProvider.");
      } else {
        const created = await Tickets.create(payloadTicket);
        createdId = created?.ID ?? "";
        console.log("Ticket creado con ID:", createdId);
      }

      // 2) Invocar Flow de Cajeros POS
      try {
        await flowCajerosPos.invoke<FlowToSP, any>({
          Cedula: state.Cedula,
          Compañia: state.Compañia,
          CorreoTercero: state.solicitante?.email ?? "",
          Usuario: state.solicitante?.label ?? "" ,        
          CO: state.CO,
        });
      } catch (err) {
        console.error("[Flow] Error invocando flujo Cajeros POS:", err);
      }

      // 3) Limpiar formulario
      setState({
        Cedula: "",
        CO: "",
        Compañia: "",
        CorreoTercero: "",
        resolutor: null,
        solicitante: null,
        usuario: "",
      });
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  return {
    state,
    setField,
    errors,
    submitting,
    handleSubmit,
  };
}
