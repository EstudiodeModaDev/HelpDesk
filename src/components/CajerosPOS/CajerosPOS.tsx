import * as React from "react";
import "./CajerosPOS.css"; // importa el css que nos diste
import { useCajerosPOS } from "../../Funcionalidades/CajerosPos";
import type { TicketsService } from "../../Services/Tickets.service";
import type { UsuariosSPService } from "../../Services/Usuarios.Service";
import { useAuth } from "../../auth/authContext";
import Select, { type SingleValue } from "react-select";


// Si los traes por contexto, puedes reemplazar estas props por useGraphServices()
type Props = {
  services: {
    Tickets?: TicketsService;
    Usuarios: UsuariosSPService;
  };
};

type Option = { value: string; label: string, email?: string };

const companiaOptions: Option[] = [
  { value: "1", label: "Estudio de Moda S.A." },
  { value: "11", label: "DH Retail" },
  { value: "9", label: "Denim Head" },
];

export default function CajerosPOSForm({ services }: Props) {
  const { state, setField, errors, submitting, handleSubmit } = useCajerosPOS(services);

  // Helpers controlados para solicitante 
  const {account } = useAuth();

  // Sincroniza con el hook cuando cambian los inputs
  React.useEffect(() => {
    if (!account) return;
    const email = account.username ?? "";
    const name  = (account as any).name ?? email; // usa name si existe, si no el email

    if (email) {
      setField("solicitante", { value: email, label: name, email });
    }
  }, [account, setField]);


  return (
    <div className="detalle-ticket">
      <h2>Creación de usuario POS</h2>

      <form onSubmit={handleSubmit} noValidate>

        <div className="fila">
          <div className="campo">
            <label>Solicitante</label>
            <input
              type="text"
              value={state.solicitante?.label ?? ""}
              readOnly
            />
          </div>
          <div className="campo">
            <label>Correo solicitante</label>
            <input
              type="text"
              value={state.solicitante?.email ?? ""}
              readOnly
            />
          </div>
        </div>

        {/* Fila 2: Cédula y CO */}
        <div className="fila">
          <div className="campo">
            <label>Cédula</label>
            <input
              type="text"
              value={state.Cedula}
              onChange={(e) => setField("Cedula", e.target.value)}
              placeholder="Documento del usuario"
            />
            { (errors as any).Cedula && (
              <small style={{ color: "#b91c1c" }}>{(errors as any).Cedula}</small>
            )}
          </div>

          <div className="campo">
            <label>CO</label>
            <input
              type="text"
              value={state.CO}
              onChange={(e) => setField("CO", e.target.value)}
              placeholder="Centro Operativo / Código"
            />
            { (errors as any).CO && (
              <small style={{ color: "#b91c1c" }}>{(errors as any).CO}</small>
            )}
          </div>
        </div>

        {/* Fila 3: Compañía y Usuario POS */}

        <div className="fila">
          <div className="campo">
            <label>Compañía</label>
            <Select<Option, false>
              classNamePrefix="rs"
              placeholder="Selecciona compañía…"
              options={companiaOptions}
              // state.Compañia es string; mapeamos al option correspondiente
              value={companiaOptions.find(o => o.value === state.Compañia) ?? null}
              onChange={(opt: SingleValue<Option>) =>
                setField("Compañia", opt?.value ?? "")
              }
              isClearable
            />
            {(errors as any).Compañia && (
              <small style={{ color: "#b91c1c" }}>
                {(errors as any).Compañia}
              </small>
            )}
          </div>
        </div>

        {/* Acción */}
        <div style={{ marginTop: 10 }}>
          <button type="submit" className="btn-volver" disabled={submitting}>
            {submitting ? "Procesando…" : "Crear usuario POS y ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
