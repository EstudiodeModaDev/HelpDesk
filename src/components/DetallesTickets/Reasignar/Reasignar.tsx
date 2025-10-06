import Select, { components, type OptionProps } from "react-select";
import "./Reasignar.css";
import type { UserOption } from "../../../Models/Commons";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import { useUsuarios } from "../../../Funcionalidades/Usuarios";
import { UsuariosSPService } from "../../../Services/Usuarios.Service";
import { useReasignarTicket } from "../../../Funcionalidades/Reasignar";
import type { Ticket } from "../../../Models/Tickets";
import type { LogService } from "../../../Services/Log.service";

const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

type UserOptionEx = UserOption & { source?: "Empleado" | "Franquicia" };

export default function Reasignar({ ticket }: { ticket: Ticket }) {
  const {Usuarios: UsuariosSPServiceSvc, Logs: LogSvc} = useGraphServices() as ReturnType<typeof useGraphServices> & {
    Logs : LogService;
    Usuarios: UsuariosSPService;
  };

  const {state, errors, submitting, setField, handleReasignar} = useReasignarTicket({Usuarios: UsuariosSPServiceSvc, Logs: LogSvc }, ticket);
  const { UseruserOptions, loading, error } = useUsuarios(UsuariosSPServiceSvc!);

  // ====== Filtro genérico (insensible a acentos) para react-select

  const userFilter = (option: any, raw: string) => {
    const q = norm(raw);
    if (!q) return true;
    const label = option?.label ?? "";
    const data = option?.data as UserOptionEx | undefined;
    const email = (data as any)?.email ?? "";
    const job = (data as any)?.jobTitle ?? "";
    const haystack = norm(`${label} ${email} ${job}`);
    return haystack.includes(q);
  };

  const Option = (props: OptionProps<UserOptionEx, false>) => {
    const { data, label } = props;
    return (
      <components.Option {...props}>
        <div className="rs-opt">
          <div className="rs-opt__text">
            <span className="rs-opt__title">{label}</span>
            {(data as any).email && <span className="rs-opt__meta">{(data as any).email}</span>}
            {(data as any).jobTitle && <span className="rs-opt__meta">{(data as any).jobTitle}</span>}
          </div>
          {data.source && <span className="rs-opt__tag">{data.source}</span>}
        </div>
      </components.Option>
    );
  };


  return (
    <div className="ticket-form">
      <h2 className="tf-title">Reasignar Ticket</h2>

      <form onSubmit={handleReasignar} noValidate className="tf-grid">

        {/* Resolutor */}
        <div className="tf-field">
          <label className="tf-label">Nuevo Resolutor</label>
          <Select<UserOptionEx, false>
            options={UseruserOptions}
            placeholder={loading ? "Cargando usuarios…" : "Buscar resolutor…"}
            value={state.resolutor}
            onChange={(opt) => setField("resolutor", opt ?? null)}
            classNamePrefix="rs"
            isDisabled={submitting || loading}
            isLoading={loading}
            filterOption={userFilter as any}
            components={{ Option: Option as any }}
            noOptionsMessage={() => (error ? "Error cargando usuarios" : "Sin coincidencias")}
            isClearable
          />
          {errors.resolutor && <small className="error">{errors.resolutor}</small>}
        </div>

        {/* Submit */}
        <div className="tf-actions tf-col-2">
          <button disabled={submitting || loading} className="tf-submit" onClick={() => handleReasignar}>
            {submitting ? "Enviando..." : "Enviar solicitud"}
          </button>
        </div>
      </form>
    </div>
  );
}
