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

export function CaseDetail({ ticket, onVolver, role }: Props) {
  // === Estado local del ticket seleccionado
  const [selected, setSelected] = React.useState<Ticket>(ticket);
  React.useEffect(() => {
    if (!selected || selected.ID !== ticket.ID) {
      setSelected(ticket);
    }
    // al cambiar de ticket, oculta paneles
    setShowSeg(false);
    setShowRecat(false);
    setShowReasig(false);
    setShowObservador(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.ID]);

  const [showSeg, setShowSeg] = React.useState(false);
  const [showRecat, setShowRecat] = React.useState(false);
  const [showReasig, setShowReasig] = React.useState(false);
  const [showObservador, setShowObservador] = React.useState(false);

  const canRecategorizar = hasRecatRole?.(role) ?? false;

  // === Derivados (memoizados)
  const categoria = React.useMemo(
    () =>
      [selected?.Categoria, selected?.SubCategoria, selected?.SubSubCategoria]
        .filter(Boolean)
        .join(" > "),
    [selected?.Categoria, selected?.SubCategoria, selected?.SubSubCategoria]
  );

  if (!selected) return <div>Ticket no encontrado</div>;

  return (
    <section className="case-detail">
      {/* Encabezado */}
      <header className="cd-header">
        <h2 className="cd-title">Caso – ID {selected.ID}</h2>
        <button type="button" className="btn-volver" onClick={onVolver}>
          ← Volver
        </button>
      </header>

      {/* Grid de 3 columnas */}
      <div className="cd-grid">
        {/* Columna 1 */}
        <div className="cd-panel">
          <Row label="Fecha de Apertura">
            <span className="cd-pill">{selected.FechaApertura ?? "—"}</span>
          </Row>

          <Row label="Fecha de solución">
            <span>{selected.TiempoSolucion ?? "—"}</span>
          </Row>

          <hr className="cd-div" />

          <Row label="Estado">
            <div className="cd-inline">
              <span
                className={`cd-badge ${
                  selected.Estadodesolicitud === "Cerrado" ? "is-closed" : "is-open"
                }`}
              >
                {selected.Estadodesolicitud}
              </span>
            </div>
          </Row>

          <Row label="ANS">
            <span>{selected.ANS ?? "—"}</span>
          </Row>
        </div>

        {/* Columna 2 */}
        <div className="cd-panel">
          <Row label="Categoría">
            {canRecategorizar ? (
              <button
                type="button"
                className="as-text"
                title="Recategorizar ticket"
                onClick={() => setShowRecat(true)}
              >
                {categoria || "–"}
              </button>
            ) : (
              <span>{categoria || "–"}</span>
            )}
          </Row>

          <Row label="Fuente solicitante">
            <span>{selected.Fuente ?? "—"}</span>
          </Row>
        </div>

        {/* Columna 3 */}
        <div className="cd-panel cd-col3">
          {/* Franja de 4 columnas */}
          <div className="cd-people">
            <div className="cd-people-item">
              <div className="cd-people-label">Actor</div>
              <div className="cd-people-value">—</div>
            </div>

            <div className="cd-people-item">
              <div className="cd-people-label">Solicitante</div>
              <div className="cd-people-value">{selected.Solicitante ?? "—"}</div>
            </div>

            <div className="cd-people-item">
              <div className="cd-people-label">Observador</div>
              <div className="cd-people-value">
                {canRecategorizar ? (
                  <button
                    type="button"
                    className="as-text"
                    title="Asignar observador"
                    onClick={() => setShowObservador(true)}
                  >
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
              <div className="cd-people-value">
                {canRecategorizar ? (
                  <button
                    type="button"
                    className="as-text"
                    title="Reasignar ticket"
                    onClick={() => setShowReasig(true)}
                  >
                    {selected.Nombreresolutor || "–"}
                  </button>
                ) : (
                  <span title="No tiene permisos para reasignar">
                    {selected.Nombreresolutor || "–"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="cd-fields">
            <Row label="Título">
              <span>{selected.Title}</span>
            </Row>
            <Row label="Descripción">
              <HtmlContent html={selected.Descripcion ?? ""} />
            </Row>
            <Row label="Casos asociados">
              <span>—</span>
            </Row>
          </div>
        </div>
      </div>

      {/* ======= Tickets relacionados (padre/hijos) ======= */}
      <div className="seccion">
        <TicketsAsociados
          key={String(selected.ID)}
          ticket={selected}
          onSelect={(t: Ticket) => {
            setSelected(t);
            setShowSeg(false);
          }}
        />
      </div>

      {/* Botón Seguimiento (toggle) */}
      <div>
        <button
          type="button"
          className="btn-volver"
          onClick={() => setShowSeg((v) => !v)}
        >
          {showSeg ? "Ocultar seguimiento" : "Seguimiento ticket"}
        </button>
      </div>

      {/* Historial (solo si showSeg = true) */}
      {showSeg && (
        <div className="seccion">
          <TicketHistorial
            role={role ?? "Usuario"}
            onVolver={() => setShowSeg(false)}
            ticketId={selected.ID!}
            onAddClick={() => {}}
            onViewClick={() => {}}
            ticket={selected}
          />
        </div>
      )}

      {/* ==== Modal de Recategorización ==== */}
      {showRecat && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Recategorizar ticket">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Recategorizar ticket #{selected.ID}</h3>
              <button type="button" className="modal-close" onClick={() => setShowRecat(false)} aria-label="Cerrar">
                ✕
              </button>
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
              <button type="button" className="modal-close" onClick={() => setShowReasig(false)} aria-label="Cerrar">
                ✕
              </button>
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
              <button type="button" className="modal-close" onClick={() => setShowObservador(false)} aria-label="Cerrar">
                ✕
              </button>
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


