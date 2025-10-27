import * as React from "react";
import type { Ticket } from "../../Models/Tickets";
import "./DetalleTicket.css";

import TicketHistorial from "../Seguimiento/Seguimiento";
import HtmlContent from "../Renderizador/Renderizador";
import { toISODateTimeFlex } from "../../utils/Date";

import Recategorizar from "./ModalRecategorizar/Recategorizar";
import Reasignar from "./Reasignar/Reasignar";
import AsignarObservador from "./Observador/Observador";
import TicketsAsociados from "./TicketsRelacionados/Relacionados";

/* ================== Helpers y tipos ================== */
const hasRecatRole = (r?: string) => {
  const v = (r ?? "").trim().toLowerCase();
  return v === "administrador" || v === "tecnico" || v === "técnico";
};

type Props = {
  ticket: Ticket;          // Ticket con el que se abre el detalle
  role: string;
};

/* ================== Componente ================== */
export default function DetalleTicket({ ticket, role }: Props) {
  // Estado interno: ticket seleccionado (se actualiza con los clics de TicketsAsociados)
  const [selected, setSelected] = React.useState<Ticket>(ticket);

  // Si cambia la prop `ticket` (por navegación externa), sincroniza el seleccionado
  React.useEffect(() => {
    if (!selected || selected.ID !== ticket.ID) {
      setSelected(ticket);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.ID]);

  // Modales y toggles
  const [showSeg, setShowSeg] = React.useState(false);
  const [showRecat, setShowRecat] = React.useState(false);
  const [showReasig, setShowReasig] = React.useState(false);
  const [showObservador, setShowObservador] = React.useState(false);

  const canRecategorizar = hasRecatRole(role);

  // Derivados del ticket seleccionado
  const categoria = [selected.Categoria, selected.SubCategoria, selected.SubSubCategoria]
    .filter(Boolean)
    .join(" > ");

  const fechaApertura = toISODateTimeFlex(selected.FechaApertura) || "–";
  const fechaMaxSolucion = selected.TiempoSolucion
    ? `${toISODateTimeFlex(selected.TiempoSolucion)}${selected.ANS ? ` (${selected.ANS})` : ""}`
    : "No hay fecha de solución establecida";

  if (!selected) return <div>Ticket no encontrado</div>;

  return (
    <div className="detalle-ticket">
      {/* Header superior */}
      <h2>Detalles Ticket #{selected.ID}</h2>

      {/* Fila 1: Asunto / Categoría */}
      <div className="fila">
        <div className="campo">
          <label>Asunto</label>
          <span>{selected.Title}</span>
        </div>

        <div className="campo">
          <label>Categoría</label>
          {canRecategorizar ? (
            <button type="button" className="as-text" onClick={() => setShowRecat(true)} title="Recategorizar ticket" >
              {categoria || "–"}
            </button>
          ) : (
            <span title="No tiene permisos para recategorizar">{categoria || "–"}</span>
          )}
        </div>
      </div>

      {/* Fila 2: Fechas */}
      <div className="fila">
        <div className="campo">
          <label>Fecha de Apertura</label>
          <span>{fechaApertura}</span>
        </div>
        <div className="campo">
          <label>Fecha máxima de solución</label>
          <span>{fechaMaxSolucion}</span>
        </div>
      </div>

      {/* Fila 3: Resolutor / Solicitante */}
      <div className="fila">
        <div className="campo">
          <label>Resolutor del caso</label>
          {canRecategorizar ? (
            <button type="button" className="as-text" onClick={() => setShowReasig(true)} title="Reasignar ticket" >
              {selected.Nombreresolutor || "–"}
            </button>
          ) : (
            <span title="No tiene permisos para reasignar">{selected.Nombreresolutor || "–"}</span>
          )}
        </div>
        <div className="campo">
          <label>Solicitante del ticket</label>
          <span>{selected.Solicitante || "–"}</span>
        </div>
      </div>

      {/* Fila 4: Estado / Fuente */}
      <div className="fila">
        <div className="campo">
          <label>Estado del caso</label>
          <span>{selected.Estadodesolicitud || "–"}</span>
        </div>

        <div className="campo">
          <label>Fuente de solicitud</label>
          <span>{selected.Fuente || "–"}</span>
        </div>
      </div>

      {/* Fila 5: Descripción / Observador */}
      <div className="fila">
        <div className="campo">
          <label>Descripción del caso</label>
          <div className="descripcion-wrap">
            <HtmlContent html={selected.Descripcion} />
          </div>
        </div>

        <div className="campo">
          <label>Observador del caso</label>
          {canRecategorizar ? (
            <button type="button" className="as-text" onClick={() => setShowObservador(true)} title="Asignar observador del ticket">
              {selected.Observador || "–"}
            </button>
          ) : (
            <span title="No tiene permisos para nombrar un observador">
              {selected.Observador || "No hay observador asignado"}
            </span>
          )}
        </div>
      </div>

      {/* ======= Tickets relacionados (padre/hijos) ======= */}
      <TicketsAsociados key={selected.ID} ticket={selected} onSelect={(t) => {setSelected(t); setShowSeg(false); }}/>

      {/* Botón Seguimiento (toggle) */}
      <div>
        <button className="btn-volver" onClick={() => setShowSeg((v) => !v)}>
          {showSeg ? "Ocultar seguimiento" : "Seguimiento ticket"}
        </button>
      </div>

      {/* Historial (solo si showSeg = true) */}
      {showSeg && (
        <div style={{ marginTop: 16 }}>
          <TicketHistorial role={role ?? "Usuario"} onVolver={() => setShowSeg(false)} ticketId={selected.ID!} onAddClick={() => {}} onViewClick={() => {}} ticket={selected}/>
        </div>
      )}

      {/* ==== Modal de Recategorización ==== */}
      {showRecat && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Recategorizar ticket">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Recategorizar ticket #{selected.ID}</h3>
              <button className="modal-close" onClick={() => setShowRecat(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <Recategorizar ticket={selected} />
            </div>
          </div>
        </div>
      )}

      {/* ==== Modal de Reasignación ==== */}
      {showReasig && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Reasignar ticket">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Reasignar ticket #{selected.ID}</h3>
              <button className="modal-close" onClick={() => setShowReasig(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <Reasignar ticket={selected} />
            </div>
          </div>
        </div>
      )}

      {/* ==== Modal de Observador ==== */}
      {showObservador && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Asignar observador">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Asignar observador a ticket #{selected.ID}</h3>
              <button className="modal-close" onClick={() => setShowObservador(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <AsignarObservador ticket={selected} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
