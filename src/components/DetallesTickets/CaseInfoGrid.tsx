import * as React from "react";
import type { Ticket } from "../../Models/Tickets";
import { ParseDateShow } from "../../utils/Date";
import Trunc from "../Trunc/trunc";
import HtmlContent from "../Renderizador/Renderizador";

function Row({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`cd-row ${className}`}>
      <label className="cd-label">{label}</label>
      <div className="cd-value">{children}</div>
    </div>
  );
}

type CaseInfoGridProps = {
  ticket: Ticket;
  canRecategorizar: boolean;
  onOpenCategoria: () => void;
  onOpenObservador: () => void;
  onOpenResolutor: () => void;
  onOpenFuente:  () => void;
};

export default function CaseInfoGrid({
  ticket,
  canRecategorizar,
  onOpenCategoria,
  onOpenObservador,
  onOpenResolutor,
  onOpenFuente
}: CaseInfoGridProps) {
  const categoria = [ticket.Categoria, ticket.SubCategoria, ticket.Articulo]
    .filter(Boolean)
    .join(" > ");

  return (
    <div className="cd-grid">
      {/* Fila 1 */}
      <Row className="pos-apertura" label="Fecha de Apertura">
        <Trunc text={ParseDateShow(ticket.FechaApertura ?? "") ?? "—"} />
      </Row>

      <Row className="pos-solucion" label="Fecha de Solución">
        <Trunc text={ParseDateShow(ticket.FechaMaxima ?? "") ?? "—"} />
      </Row>

      <Row className="pos-fuente" label="Fuente solicitante">
        {canRecategorizar ? (
          <button type="button" className="as-text" onClick={onOpenFuente}>
            <Trunc text={ticket.Fuente || "–-----------"} lines={1} maxLenght={30} />
          </button>
            ) : (
            ticket.Fuente || "-----------"
          )}
      </Row>

      {/* Fila 2 */}
      <Row className="pos-categoria" label="Categoría">
        {canRecategorizar ? (
          <button type="button" className="as-text" onClick={onOpenCategoria}>
            <Trunc text={categoria || "-----------"} lines={1} />
          </button>
        ) : (
          <Trunc text={categoria || "-----------"} lines={1} />
        )}
      </Row>

      <Row className="pos-ans" label="ANS">
        <Trunc text={ticket.ANS ?? "N/A"} lines={1} />
      </Row>

      {/* Fila 3: personas */}
      <div className="cd-people pos-people">
        <div className="cd-people-item">
          <div className="cd-people-label">Solicitante</div>
          <div className="cd-people-value">
            <Trunc text={ticket.Solicitante} lines={1} maxLenght={30} />
          </div>
        </div>

        <div className="cd-people-item">
          <div className="cd-people-label">Observador</div>
          <div className="cd-people-value">
            {canRecategorizar ? (
              <button type="button" className="as-text" onClick={onOpenObservador}>
                <Trunc text={ticket.Observador || "–-----------"} lines={1} maxLenght={30} />
              </button>
            ) : (
              ticket.Observador || "-----------"
            )}
          </div>
        </div>

        <div className="cd-people-item">
          <div className="cd-people-label">Resolutor</div>
          <div className="cd-people-value">
            {canRecategorizar ? (
              <button type="button" className="as-text" onClick={onOpenResolutor}>
                <Trunc text={ticket.Nombreresolutor || "-----------"} lines={1} maxLenght={30} />
              </button>
            ) : (
              <Trunc text={ticket.Nombreresolutor || "–"} lines={1} />
            )}
          </div>
        </div>
      </div>

      {/* Fila 4: Título */}
      <Row className="pos-titulo" label="Título">
        {ticket.AsuntoTicket}
      </Row>

      {/* Fila 5: Descripción (HTML truncada en móvil vía .html-trunc) */}
      <Row className="pos-descr" label="Descripción">
        <div className="html-trunc">
          <HtmlContent html={ticket.Descripcion ?? ""} />
        </div>
      </Row>
    </div>
  );
}
