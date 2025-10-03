import * as React from "react";
import Select, { type SingleValue } from "react-select";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { UsuariosSPService } from "../../../Services/Usuarios.Service";
import type { Ticket } from "../../../Models/Tickets";
import { useRecategorizarTicket } from "../../../Funcionalidades/Reasignar";
import { useUsuarios } from "../../../Funcionalidades/Usuarios";
import type { UserOption } from "../../../Models/Commons";

const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export default function Reasignar({ ticket }: { ticket: Ticket }) {
  // Servicios
  const { Usuarios } = useGraphServices() as { Usuarios: UsuariosSPService };

  // Hook de reasignación (usa resolutor + nota)
  const { state, setField, errors, submitting, handleReasignar } =
    useRecategorizarTicket({ Usuarios }, ticket);

  // Hook de usuarios (fuente del combo)
  const { UseruserOptions, loading, error } = useUsuarios(Usuarios!);

  // Filtra: solo técnicos activos y disponibles (si esos campos existen en cada opción)
  const techOptions = React.useMemo(() => {
    return (UseruserOptions ?? []).filter((o: any) => {
      const rol = (o?.Rol ?? o?.rol ?? "").toString().toLowerCase();
      const activo = o?.Activo ?? o?.activo;
      const disponible = (o?.Disponible ?? o?.disponible ?? "").toString().toLowerCase();
      // Si no hay metadata, al menos devuelve todos para no dejar vacío
      if (rol === "" && activo === undefined && disponible === "") return true;
      return (rol === "tecnico" || rol === "técnico") && Boolean(activo) && disponible === "disponible";
    }) as UserOption[];
  }, [UseruserOptions]);

  // Búsqueda insensible a acentos por label/email/jobTitle si viene
  const userFilter = (option: any, raw: string) => {
    const q = norm(raw);
    if (!q) return true;
    const label = option?.label ?? "";
    const data = option?.data as any;
    const email = data?.email ?? data?.Correo ?? "";
    const job = data?.jobTitle ?? "";
    return norm(`${label} ${email} ${job}`).includes(q);
  };

  // Valor seleccionado (por email o por value)
  const valueOption = React.useMemo(() => {
    if (!state.resolutor) return null;
    const byEmail = techOptions.find((o: any) => (o?.email ?? o?.Correo) === state.resolutor?.email);
    if (byEmail) return byEmail as UserOption;
    const byValue = techOptions.find((o) => o.value === (state.resolutor as any)?.value);
    return (byValue ?? null) as SingleValue<UserOption>;
  }, [state.resolutor, techOptions]);

  const onChangeResolutor = (opt: SingleValue<UserOption>) => {
    setField("resolutor", (opt ?? null) as any); // tu hook espera { value,label,email }
  };

  return (
    <form className="tf-grid" onSubmit={handleReasignar} noValidate>
      <h3 style={{ marginBottom: 12 }}>Reasignar ticket #{ticket.ID}</h3>

      <div className="tf-field tf-col-2">
        <label className="tf-label">Nuevo resolutor</label>
        <Select<UserOption, false>
          classNamePrefix="rs"
          options={techOptions}
          value={valueOption}
          isLoading={loading}
          onChange={onChangeResolutor}
          isClearable
          filterOption={userFilter as any}
          placeholder={loading ? "Cargando usuarios…" : "Seleccione un técnico"}
          noOptionsMessage={() => (error ? "Error cargando usuarios" : "Sin resultados")}
        />
        {errors.resolutor && <small className="error">{errors.resolutor}</small>}
      </div>

      <div className="tf-field tf-col-2">
        <label className="tf-label">Nota (opcional)</label>
        <textarea
          className="tf-textarea"
          rows={4}
          value={state.Nota ?? ""}
          onChange={(e) => setField("Nota", e.target.value)}
          placeholder="Motivo o contexto de la reasignación…"
        />
      </div>

      <div className="tf-actions tf-col-2">
        <button type="submit" className="tf-submit" disabled={submitting}>
          {submitting ? "Reasignando..." : "Reasignar"}
        </button>
      </div>
    </form>
  );
}
