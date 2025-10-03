import * as React from "react";
import Select, {type SingleValue } from "react-select";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { UsuariosSPService } from "../../../Services/Usuarios.Service";
import type { Ticket } from "../../../Models/Tickets";
import { useRecategorizarTicket } from "../../../Funcionalidades/Reasignar"; 
import type { GetAllOpts } from "../../../Models/Commons";

type ResolutorOption = { value: string; label: string; email: string };

const escapeOData = (s: string) => String(s ?? "").replace(/'/g, "''");

export default function Reasignar({ ticket }: { ticket: Ticket }) {
  // Solo necesitamos Usuarios para listar resolutores
  const { Usuarios } = useGraphServices() as { Usuarios: UsuariosSPService };

  // Usa tu hook (que reasigna)
  const { state, setField, errors, submitting, handleReasignar } = useRecategorizarTicket(
    { Usuarios },
    ticket
  );

  // Cargar resolutores candidatos (Técnicos activos y disponibles)
  const [options, setOptions] = React.useState<ResolutorOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadTecnicos = React.useCallback(async (q: string = "") => {
    setLoading(true);
    try {
      // Filtra por rol + estado; si quieres agregar búsqueda por nombre, añade un $filter extra
      const baseFilter =
        "Rol eq 'Tecnico' and Activo eq true and Disponible eq 'Disponible'";

      // Si hay texto, filtra por Title (nombre) que contenga q (SharePoint no soporta contains en OData clásico;
      // si tienes Search habilitado, puedes usar startswith. Aquí ejemplo con startswith):
      const searchFilter = q
        ? ` and (startswith(Title,'${escapeOData(q)}') or startswith(Correo,'${escapeOData(q)}'))`
        : "";

      const opts: GetAllOpts = {
        filter: baseFilter + searchFilter,
        top: 50,
        orderby: "fields/Title asc",
      };

      const rows = await Usuarios.getAll(opts);
      const mapped = (rows ?? []).map((u: any) => ({
        value: String(u.ID),
        label: String(u.Title ?? u.Nombre ?? u.Correo ?? "—"),
        email: String(u.Correo ?? ""),
      })) as ResolutorOption[];

      setOptions(mapped);
    } catch (e) {
      console.error("Error cargando técnicos:", e);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [Usuarios]);

  React.useEffect(() => {
    loadTecnicos();
  }, [loadTecnicos]);

  const valueOption: ResolutorOption | null = React.useMemo(() => {
    if (!state.resolutor?.email) return null;
    const found = options.find(o => o.email === state.resolutor?.email);
    return found ?? { value: "", label: state.resolutor?.label ?? state.resolutor?.email ?? "", email: state.resolutor.email };
  }, [state.resolutor, options]);

  const onChangeResolutor = (opt: SingleValue<ResolutorOption>) => {
    if (!opt) {
      setField("resolutor", null);
      return;
    }
    // Tu hook necesita state.resolutor con .email
    setField("resolutor", { value: opt.value, label: opt.label, email: opt.email } as any);
  };

  return (
    <form className="tf-grid" onSubmit={handleReasignar} noValidate>
      <h3 style={{ marginBottom: 12 }}>Reasignar ticket #{ticket.ID}</h3>

      <div className="tf-field tf-col-2">
        <label className="tf-label">Nuevo resolutor</label>
        <Select
          classNamePrefix="rs"
          options={options}
          value={valueOption}
          isLoading={loading}
          onChange={onChangeResolutor}
          onInputChange={(q) => {
            // búsqueda “al vuelo”
            loadTecnicos(q);
            return q;
          }}
          isClearable
          placeholder={loading ? "Cargando técnicos..." : "Seleccione un técnico"}
          noOptionsMessage={() => (loading ? "Cargando..." : "Sin resultados")}
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
