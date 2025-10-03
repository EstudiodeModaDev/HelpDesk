import * as React from "react";
import { useState } from "react";
import type { FormErrors } from "../Models/nuevoTicket";
import type { GetAllOpts } from "../Models/Commons";
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

/** Hook de alta de “Cajeros POS” + creación de ticket + actualización de casos del resolutor + disparo de Flow */
export function useCajerosPOS(services: Svc) {
  const { Tickets, Usuarios } = services;

  const [state, setState] = useState<FormStateCajeros>({
    Cedula: "",
    CO: "",
    Compañia: "",
    CorreoTercero: "",
    CorreoUsuario: "",
    resolutor: null,
    solicitante: null,
    usuario: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Instancia del Flow (REEMPLAZA LA URL)
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
    if (!state.CorreoTercero.trim()) e.CorreoTercero = "Por favor digite el correo del tercero";
    if (!state.CorreoUsuario.trim()) e.CorreoUsuario = "Por favor digite el correo del usuario";

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
        Nombreresolutor: state.resolutor?.label,
        Correoresolutor: state.resolutor?.email,
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

      // 2) Actualizar contador de casos del resolutor (si hay resolutor)
      try {
        const email = payloadTicket.Correoresolutor?.trim();
        if (email) {
          const opts: GetAllOpts = {
            filter: `Correo eq '${email.replace(/'/g, "''")}'`,
            top: 1,
          };
          const rows = await Usuarios.getAll(opts);
          const resolutorRow = rows?.[0];
          if (resolutorRow?.ID != null) {
            const prev = Number(resolutorRow.Numerodecasos ?? 0);
            const next = prev + 1;
            const updated = await Usuarios.update(String(resolutorRow.ID), { Numerodecasos: next });
            console.log("Resolutor actualizado:", updated);
          } else {
            console.warn("No se encontró resolutor con ese correo:", email);
          }
        } else {
          console.warn("No hay Correoresolutor en el payload; no se puede incrementar conteo.");
        }
      } catch (err) {
        console.error("Error actualizando contador del resolutor:", err);
      }

      // 3) Invocar Flow de Cajeros POS
      try {
        await flowCajerosPos.invoke<FlowToSP, any>({
          Cedula: state.Cedula,
          CO: state.CO,
          Compañia: state.Compañia,
          CorreoTercero: state.CorreoTercero,
          CorreoUsuario: state.CorreoUsuario,
          Usuario: state.CorreoUsuario,
        });
      } catch (err) {
        console.error("[Flow] Error invocando flujo Cajeros POS:", err);
      }

      // 4) Limpiar formulario
      setState({
        Cedula: "",
        CO: "",
        Compañia: "",
        CorreoTercero: "",
        CorreoUsuario: "",
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
