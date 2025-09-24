// src/components/Formatos/Formatos.tsx
import { useState } from "react";
import "./Formatos.css";

import SolicitudUsuarioForm from "./ServiciosTI/ServiciosTI";
import SolicitudesRed from "./Seguridad de red/SeguridadRed";
import SolicitudERP from "./SeguridadERP/SeguridadERP";
import PermisosNavegacion from "./PermisosNavegacion/PermisosNavegacion"; // ⬅️ NUEVO

import type { SolicitudUsuario } from "../../Funcionalidades/Formatos";
import type { OpcionSolicitud } from "../../Models/Formatos";
import type {
  FilaSolicitudRed,
  FilaSolicitudERP, 
} from "../../Models/Formatos";
import type { FilaPermisoNav } from "../../Funcionalidades/PermisosNavegacion";

const OPCIONES: OpcionSolicitud[] = [
  "Solicitud de servicios de TI",
  "FR Admin seguridad unidad de red",
  "FR Administrador seguridad ERP",
  "Administrador",
  "permisos de navegacion",
] as const;

const TYC_BY_OPCION: Record<OpcionSolicitud, string> = {
  "Solicitud de servicios de TI": `...`,
  "FR Admin seguridad unidad de red": `...`,
  "FR Administrador seguridad ERP": `
    <p><strong><em>Recuerda:</em></strong></p>
    <ul>
      <li>TI tiene 8 horas <strong>hábiles</strong> para responder.</li>
      <li>Completa perfil, permisos y datos del usuario por fila.</li>
    </ul>
  `,
  "Administrador": `...`,
  "permisos de navegacion": `
    <p><strong><em>Recuerda:</em></strong></p>
    <ul>
      <li>Marca los sitios a los que el usuario requiere acceso.</li>
      <li>Si es otro sitio, coloca la URL en el campo “Otro”.</li>
      <li>Indica el Jefe / Quien autoriza en cada fila.</li>
    </ul>
  `,
};

export default function Formatos() {
  const [opcion, setOpcion] = useState<OpcionSolicitud | null>(null);
  const [acepta, setAcepta] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const confirmar = () => {
    if (opcion && acepta) setConfirmado(true);
  };

  if (confirmado && opcion) {
    // TI
    if (opcion === "Solicitud de servicios de TI") {
      const handleSubmitTI = async (payload: SolicitudUsuario) => {
        console.log("TI → payload", payload);
      };
      return <SolicitudUsuarioForm onSubmit={handleSubmitTI} />;
    }

    // Seguridad unidad de red
    if (opcion === "FR Admin seguridad unidad de red") {
      const handleSubmitPermisosRed = async (payload: Omit<FilaSolicitudRed, "id">[]) => {
        console.log("Permisos de red → payload", payload);
      };
      return <SolicitudesRed onSubmit={handleSubmitPermisosRed} />;
    }

    // Seguridad ERP
    if (opcion === "FR Administrador seguridad ERP") {
      const handleSubmitERP = async (payload: Omit<FilaSolicitudERP, "id">[]) => {
        console.log("ERP → payload", payload);
      };
      return <SolicitudERP onSubmit={handleSubmitERP} />;
    }

    // ✅ Permisos de navegación (AQUÍ LO INVOCAS)
    if (opcion === "permisos de navegacion") {
      const handleSubmitNav = async (payload: Omit<FilaPermisoNav, "id">[]) => {
        console.log("Permisos de navegación → payload", payload);
      };
      return <PermisosNavegacion onSubmit={handleSubmitNav} jefeDefault="Practicante Listo" />;
    }

    // Otros
    if (opcion === "Administrador")
      return <div className="card">📌 Flujo: Administrador / Proyectos de Software</div>;
  }

  return (
    <section className="tg-card">
      <label className="tg-label" htmlFor="tg_select">Tipo de solicitud</label>
      <select
        id="tg_select"
        className="tg-select"
        value={opcion ?? ""}
        onChange={(e) => {
          setOpcion((e.target.value || null) as OpcionSolicitud | null);
          setAcepta(false);
          setConfirmado(false);
        }}
      >
        <option value="">Selecciona una opción…</option>
        {OPCIONES.map((op) => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>

      {opcion && (
        <div className="tg-terms">
          <h3>Términos y condiciones</h3>
          <div
            className="tg-terms-text"
            dangerouslySetInnerHTML={{ __html: TYC_BY_OPCION[opcion] }}
          />
          <label className="tg-check">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
            />
            <span>Acepto los términos y condiciones</span>
          </label>
          <div className="tg-actions">
            <button className="tg-btn-primary" onClick={confirmar} disabled={!acepta}>
              Continuar
            </button>
            <button
              className="tg-btn-ghost"
              type="button"
              onClick={() => { setOpcion(null); setAcepta(false); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
