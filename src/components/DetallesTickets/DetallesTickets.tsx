import * as React from 'react';
import type { Ticket } from '../../Models/Tickets';
import './DetalleTicket.css';
import TicketHistorial from '../Seguimiento/Seguimiento';
import HtmlContent from '../Renderizador/Renderizador';
import { toISODateTimeFlex } from '../../utils/Date';
import Recategorizar from './ModalRecategorizar/Recategorizar';
import Reasignar from './Reasignar/Reasignar';
import AsignarObservador from './Observador/Observador';

// Helper: ¿tiene permiso para recategorizar?
const hasRecatRole = (r?: string) => {
  const v = (r ?? '').trim().toLowerCase();
  return v === 'administrador' || v === 'tecnico' || v === 'técnico';
};

export default function DetalleTicket({
  ticket,
  onVolver,
  role,
}: {
  ticket: Ticket;
  onVolver: () => void;
  role: string;
}) {
  if (!ticket) return <div>Ticket no encontrado</div>;

  const [showSeg, setShowSeg] = React.useState(false);
  const [showRecat, setShowRecat] = React.useState(false);
  const [showReasig, setshowReasig] = React.useState(false);
  const [showObservador, setShowObservador] = React.useState(false);

  const categoria = [ticket.Categoria, ticket.SubCategoria, ticket.SubSubCategoria]
    .filter(Boolean)
    .join(' > ');

  const canRecategorizar = hasRecatRole(role);

  return (
    <div className="detalle-ticket">
      <button className="btn-volver" onClick={onVolver}>← Volver</button>
      <h2>Detalles Ticket #{ticket.ID}</h2>

      <div className="fila">
        <div className="campo">
          <label>Asunto</label>
          <span>{ticket.Title}</span>
        </div>

        <div className="campo">
          <label>Categoría</label>
          {canRecategorizar ? (
            <button
              type="button"
              className="as-text"   
              onClick={() => setShowRecat(true)}
              title="Recategorizar ticket"
            >
              {categoria || '–'}
            </button>
          ) : (
            <span title="No tiene permisos para recategorizar">{categoria || '–'}</span>
          )}
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Fecha de Apertura</label>
          <span>{toISODateTimeFlex(ticket.FechaApertura)|| '–'}</span>
        </div>
        <div className="campo">
          <label>Fecha máxima de solución</label>
          <span>{`${toISODateTimeFlex(ticket.TiempoSolucion)} (${ticket.ANS})` || 'No hay fecha de solución establecida'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Resolutor del caso</label>
          {canRecategorizar ? (
            <button
              type="button"
              className="as-text"   
              onClick={() => setshowReasig(true)}
              title="Recategorizar ticket"
            >
              {ticket.Nombreresolutor  || '–'}
            </button>
          ) : (
            <span title="No tiene permisos para recategorizar">{ticket.Nombreresolutor || '–'}</span>
          )}
        </div>
        <div className="campo">
          <label>Solicitante del ticket</label>
          <span>{ticket.Solicitante || '–'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Estado del caso</label>
          <span>{ticket.Estadodesolicitud || '–'}</span>
        </div>

        <div className="campo">
          <label>Fuente de solicitud</label>
          <span>{ticket.Fuente || '–'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Descripción del caso</label>
          <span><HtmlContent html={ticket.Descripcion} /></span>
        </div>

        <div className="campo">
          <label>Observador del caso</label>
          {canRecategorizar ? (
            <button
              type="button"
              className="as-text"   
              onClick={() => setShowObservador(true)}
              title="Asignar observador ticket"
            >
              {ticket.Observador  || '–'}
            </button>
          ) : (
            <span title="No tiene permisos para nombrar un observador">{ticket.Observador || 'No hay observador asignado'}</span>
          )}
        </div>
      </div>

      {/* Botón Seguimiento (toggle) */}
      <div>
        <button className="btn-volver" onClick={() => setShowSeg(v => !v)}>
          {showSeg ? 'Ocultar seguimiento' : 'Seguimiento ticket'}
        </button>
      </div>

      {/* Render del componente de seguimiento solo cuando showSeg = true */}
      {showSeg && (
        <div style={{ marginTop: 16 }}>
          <TicketHistorial
            role={role ?? 'Usuario'}
            onVolver={() => setShowSeg(false)}
            ticketId={ticket.ID!}
            onAddClick={() => {}}
            onViewClick={() => {}}
            ticket={ticket}
          />
        </div>
      )}

      {/* ==== Modal de Recategorización ==== */}
      {showRecat && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Recategorizar ticket">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Recategorizar ticket #{ticket.ID}</h3>
              <button className="modal-close" onClick={() => setShowRecat(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              {/* Pasamos role y onDone para cerrar al finalizar */}
              <Recategorizar
                ticket={ticket}
                //onDone={() => setShowRecat(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==== Modal de reasignación ==== */}
      {showReasig && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Recategorizar ticket">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Reasignar ticket #{ticket.ID}</h3>
              <button className="modal-close" onClick={() => setshowReasig(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <Reasignar ticket={ticket}></Reasignar>
            </div>
          </div>
        </div>
      )}

      {/* ==== Modal de observador ==== */}
      {showObservador && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Recategorizar ticket">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Asignar observador a ticket #{ticket.ID}</h3>
              <button className="modal-close" onClick={() => setShowObservador(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <AsignarObservador ticket={ticket}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}