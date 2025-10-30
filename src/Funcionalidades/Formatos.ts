import React from "react";
import type { SolicitudUsuario, SolicitudUsuarioErrors } from "../Models/Formatos";
import { useAuth } from "../auth/authContext";
import { FlowClient } from "./FlowClient";
import type { SoliictudServiciosFlow } from "../Models/FlujosPA";

export type SubmitFn = (payload: any) => Promise<void> | void;

export function useSolicitudServicios() {
  type FlowResponse = { ok: boolean; [k: string]: any };
  const { account, } = useAuth();
  const [state, setState] = React.useState<SolicitudUsuario>({
    contratacion: "",
    nombre: "",
    apellidos: "",
    cedula: "",
    contacto: "",
    cargo: "",
    direccion: "",
    gerencia: "",
    jefatura: "",
    centroCostos: "",
    centroOperativo: "",
    ciudad: "",
    fechaIngreso: "",
    tipoEquipo: "",
    extensionTelefonica: "No aplica",
    servicios: {correo: false, office: false, erp: false,  pedidos: false, adminpos: false, posprincipal: false, impresoras: false, generictransfer: false},
    observaciones: "",
    solicitadoPor: account?.name ?? "",
    correoSolicitadoPor: account?.username ?? ""
    });
  const [errors, setErrors] = React.useState<SolicitudUsuarioErrors>({});
  const [sending, setSending] = React.useState<boolean>(false)
  const notifyFlow = new FlowClient("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9a27af3c52744589a7f403de2a919c5b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5ygWaQOsneK490GfGq4m2PTfiYPGSkS94z0gLtgNmm4")

  const setField = <K extends keyof SolicitudUsuario>(k: K, v: SolicitudUsuario[K]) => setState((s) => ({ ...s, [k]: v }));

  const validate = () => { const e: SolicitudUsuarioErrors = {};
    if (!state.apellidos) e.apellidos = "Requerido";
    if (!state.contratacion) e.contratacion = "Requerido";
    if (!state.nombre) e.nombre = "Requerida";
    if (!state.cedula) e.cedula = "Requerida";
    if (!state.contacto) e.contacto = "Requerido";
    if (!state.cargo) e.cargo = "Requerido";
    if (!state.direccion) e.direccion = "Requerido";
    if (!state.gerencia) e.gerencia = "Requerida";
    if (!state.jefatura) e.jefatura = "Requerida";
    if (!state.centroCostos) e.centroCostos = "Requerido";
    if (!state.centroOperativo) e.centroOperativo = "Requerido";
    if (!state.ciudad) e.ciudad = "Requerida";
    if (!state.fechaIngreso) e.fechaIngreso = "Requerida";
    if (!state.tipoEquipo) e.tipoEquipo = "Requerido";
    if (!state.extensionTelefonica) e.extensionTelefonica = "Requerida";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  function sanitizeState(s: SolicitudUsuario): SolicitudUsuario {
    // asegura strings sin espacios y booleans definidos
    const clean = { ...s } as any;
    for (const k of Object.keys(clean)) {
      if (typeof clean[k] === "string") clean[k] = (clean[k] as string).trim();
    }
    // fechaIngreso debe ir como yyyy-mm-dd
    if (clean.fechaIngreso) {
      clean.fechaIngreso = String(clean.fechaIngreso).slice(0, 10);
    }
    // por si faltan servicios
    clean.servicios = {
      correo: !!clean.servicios?.correo,
      office: !!clean.servicios?.office,
      erp: !!clean.servicios?.erp,
      pedidos: !!clean.servicios?.pedidos,
      adminpos: !!clean.servicios?.adminpos,
      posprincipal: !!clean.servicios?.posprincipal,
      impresoras: !!clean.servicios?.impresoras,
      generictransfer: !!clean.servicios?.generictransfer,
    };
    return clean as SolicitudUsuario;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    try {
      const clean = sanitizeState(state);
      const payload: SoliictudServiciosFlow = {Datos: clean, User: account?.name ?? "", userEmail: account?.username ?? "",};

      const flow = await notifyFlow.invoke<SoliictudServiciosFlow, FlowResponse>(payload);

      if (flow?.ok) {
        alert("Se ha creado con éxito su ticket de solicitud de servicio.");
      } else {
        alert(
          "Ha ocurrido un error, por favor inténtalo en unos minutos. Si persiste, repórtalo a TI."
        );
      }
    } catch (err) {
      console.error("Error con el flujo", err);
      alert("No pudimos enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };


  return {
    state, errors, sending,
    setField, handleSubmit
  };
}
