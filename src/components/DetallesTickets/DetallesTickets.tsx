import * as React from "react";
import type { Ticket } from "../../Models/Tickets";
import "./DetalleTicket.css";
import TicketHistorial from "../Seguimiento/Seguimiento";
import HtmlContent from "../Renderizador/Renderizador";
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
  ticket: Ticket;          
  onVolver: () => void;
  role: string;
};

/* ================== Componente ================== */
export type Opcion = { value: string; label: string };


function Row({label, children,}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cd-row">
      <label className="cd-label">{label}</label>
      <div className="cd-value">{children}</div>
    </div>
  );
}

export function CaseDetail({ticket, onVolver, role}: Props) {
   const [selected, setSelected] = React.useState<Ticket>(ticket);
    React.useEffect(() => {
      if (!selected || selected.ID !== ticket.ID) {
        setSelected(ticket);
      }
    }, [ticket?.ID]);
    const [showSeg, setShowSeg] = React.useState(false);
    const [showRecat, setShowRecat] = React.useState(false);
    const [showReasig, setShowReasig] = React.useState(false);
    const [showObservador, setShowObservador] = React.useState(false);
    const canRecategorizar = hasRecatRole(role);

    // Derivados del ticket seleccionado
    const categoria = [selected.Categoria, selected.SubCategoria, selected.SubSubCategoria].filter(Boolean).join(" > ");

    if (!selected) return <div>Ticket no encontrado</div>;


  return (
    <section className="case-detail">
      {/* Encabezado */}
      <header className="cd-header">
        <h2 className="cd-title"> Caso – ID {ticket.ID}</h2>
        <button className="btn-volver" onClick={onVolver}>← Volver</button>
      </header>

      {/* Grid de 3 columnas */}
      <div className="cd-grid">
        {/* Columna 1 */}
        <div className="cd-panel">
          <Row label="Fecha de Apertura">
            <span className="cd-pill">{ticket.FechaApertura}</span>
          </Row>
          {/*<Row label="Tiempo para adueñarse">
            <span>{data.tiempoAdueñarse ?? "—"}</span>
          </Row>*/}
          <Row label="Fecha de solución">
            <span>{ticket.TiempoSolucion ?? "—"}</span>
          </Row>

          <hr className="cd-div" />

          <Row label="Estado">
            <div className="cd-inline">
              <span className={`cd-badge ${ticket.Estadodesolicitud === "Cerrado" ? "is-closed" : "is-open"}`}>
                {ticket.Estadodesolicitud}
              </span>
            </div>
          </Row>
          <Row label="ANS">
            <span>{ticket.ANS}</span>
          </Row>
        </div>

        {/* Columna 2 */}
        <div className="cd-panel">
          <hr className="cd-div" />

          <Row label="Categoría">
            <button type="button" className="as-text" onClick={() => setShowRecat(true)} title="Recategorizar ticket" >
              {categoria || "–"}
            </button>
          </Row>
          <Row label="Fuente solicitante">
            <span>{ticket.Fuente}</span>
          </Row>
        </div>

        {/* Columna 3 */}
        <div className="cd-panel cd-col3">
          {/* Franja de 4 columnas */}
          <div className="cd-people">
            <div className="cd-people-item">
              <div className="cd-people-label">Actor</div>
            </div>
            <div className="cd-people-item">
              <div className="cd-people-label">Solicitante</div>
              <div className="cd-people-value">{ticket.Solicitante}</div>
            </div>
            <div className="cd-people-item">
              <div className="cd-people-label">Observador</div>
              <div className="cd-people-value">
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
            <div className="cd-people-item">
              <div className="cd-people-label">Resolutor</div>
              {canRecategorizar ? (
                <button type="button" className="as-text" onClick={() => setShowReasig(true)} title="Reasignar ticket" >
                  {selected.Nombreresolutor || "–"}
                </button>
              ) : (
                <span title="No tiene permisos para reasignar">{selected.Nombreresolutor || "–"}</span>
              )}
            </div>
          </div>

          <div className="cd-fields">
            <Row label="Título">
              <span>{ticket.Title}</span>
            </Row>
            <Row label="Descripción">
              <HtmlContent html={selected.Descripcion} />
            </Row>
            <Row label="Casos asociados">
              <span>—</span>
            </Row>
          </div>
        </div>
      </div>

      {/* Acciones */}
       {/* ======= Tickets relacionados (padre/hijos) ======= */}
      <div className="seccion"><TicketsAsociados key={selected.ID} ticket={selected} onSelect={(t) => {setSelected(t); setShowSeg(false); }}/></div>

      {/* Botón Seguimiento (toggle) */}
      <div>
        <button className="btn-volver" onClick={() => setShowSeg((v) => !v)}>
          {showSeg ? "Ocultar seguimiento" : "Seguimiento ticket"}
        </button>
      </div>

      {/* Historial (solo si showSeg = true) */}
      {showSeg && (
        <div className="seccion">
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
    </section>
  );
}


