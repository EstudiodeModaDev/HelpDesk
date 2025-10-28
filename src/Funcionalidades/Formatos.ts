import React from "react";
import type { SolicitudUsuario, SolicitudUsuarioErrors } from "../Models/Formatos";
import { useAuth } from "../auth/authContext";

export type SubmitFn = (payload: any) => Promise<void> | void;

export function useSolicitudServicios() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true)

  };

  return {
    state, errors, sending,
    setField, handleSubmit
  };
}
