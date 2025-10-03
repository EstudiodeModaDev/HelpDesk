import * as React from "react";
import "./CajerosPOS.css"; // importa el css que nos diste
import { useCajerosPOS } from "../../Funcionalidades/CajerosPos";
import type { TicketsService } from "../../Services/Tickets.service";
import type { UsuariosSPService } from "../../Services/Usuarios.Service";


// Si los traes por contexto, puedes reemplazar estas props por useGraphServices()
type Props = {
  services: {
    Tickets?: TicketsService;
    Usuarios: UsuariosSPService;
  };
};

export default function CajerosPOSForm({ services }: Props) {
  const { state, setField, errors, submitting, handleSubmit } = useCajerosPOS(services);

  // Helpers controlados para solicitante y resolutor (nombre/correo)
  const [solName, setSolName] = React.useState(state.solicitante?.label ?? "");
  const [solMail, setSolMail] = React.useState(state.solicitante?.email ?? "");
  const [resName, setResName] = React.useState(state.resolutor?.label ?? "");
  const [resMail, setResMail] = React.useState(state.resolutor?.email ?? "");

  // Sincroniza con el hook cuando cambian los inputs
  React.useEffect(() => {
    if (solName || solMail) {
      setField("solicitante", {
        label: solName || solMail,
        email: solMail,
        value: solMail || solName,
      } as any);
    } else {
      setField("solicitante", null as any);
    }
  }, [solName, solMail]);

  React.useEffect(() => {
    if (resName || resMail) {
      setField("resolutor", {
        label: resName || resMail,
        email: resMail,
        value: resMail || resName,
      } as any);
    } else {
      setField("resolutor", null as any);
    }
  }, [resName, resMail]);

  return (
    <div className="detalle-ticket">
      <h2>Creación de usuario POS</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Fila 1: Solicitante y Resolutor */}
        <div className="fila">
          <div className="campo">
            <label>Nombre del solicitante</label>
            <input
              type="text"
              value={solName}
              onChange={(e) => setSolName(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
            <label style={{ fontSize: ".75rem", color: "#6b7280" }}>Correo del solicitante</label>
            <input
              type="email"
              value={solMail}
              onChange={(e) => setSolMail(e.target.value)}
              placeholder="correo@dominio.com"
            />
            { (errors as any).solicitante && (
              <small style={{ color: "#b91c1c" }}>{(errors as any).solicitante}</small>
            )}
          </div>

          <div className="campo">
            <label>Nombre del resolutor</label>
            <input
              type="text"
              value={resName}
              onChange={(e) => setResName(e.target.value)}
              placeholder="Ej: Técnico Soporte"
            />
            <label style={{ fontSize: ".75rem", color: "#6b7280" }}>Correo del resolutor</label>
            <input
              type="email"
              value={resMail}
              onChange={(e) => setResMail(e.target.value)}
              placeholder="resolutor@empresa.com"
            />
            { (errors as any).resolutor && (
              <small style={{ color: "#b91c1c" }}>{(errors as any).resolutor}</small>
            )}
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
            <input
              type="text"
              value={state.Compañia}
              onChange={(e) => setField("Compañia", e.target.value)}
              placeholder="Ej: Estudio de Moda S.A."
            />
            { (errors as any).Compañia && (
              <small style={{ color: "#b91c1c" }}>{(errors as any).Compañia}</small>
            )}
          </div>

          <div className="campo">
            <label>Usuario POS</label>
            <input
              type="text"
              value={state.usuario}
              onChange={(e) => setField("usuario", e.target.value)}
              placeholder="Usuario de inicio de sesión POS"
            />
          </div>
        </div>

        {/* Fila 4: Correos */}
        <div className="fila">
          <div className="campo">
            <label>Correo del tercero</label>
            <input
              type="email"
              value={state.CorreoTercero}
              onChange={(e) => setField("CorreoTercero", e.target.value)}
              placeholder="tercero@proveedor.com"
            />
            { (errors as any).CorreoTercero && (
              <small style={{ color: "#b91c1c" }}>{(errors as any).CorreoTercero}</small>
            )}
          </div>

          <div className="campo">
            <label>Correo del usuario</label>
            <input
              type="email"
              value={state.CorreoUsuario}
              onChange={(e) => setField("CorreoUsuario", e.target.value)}
              placeholder="usuario@empresa.com"
            />
            { (errors as any).CorreoUsuario && (
              <small style={{ color: "#b91c1c" }}>{(errors as any).CorreoUsuario}</small>
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
