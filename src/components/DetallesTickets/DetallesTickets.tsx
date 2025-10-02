import * as React from 'react';
import type { Ticket } from '../../Models/Tickets';
import './DetalleTicket.css';
import TicketHistorial from '../Seguimiento/Seguimiento'; // ajusta la ruta si es diferente
import HtmlContent from '../Renderizador/Renderizador';

export default function DetalleTicket({ ticket, onVolver, role }: { ticket: Ticket, onVolver: () => void, role: string}) {
  if (!ticket) return <div>Ticket no encontrado</div>;

  const [showSeg, setShowSeg] = React.useState(false);

  const categoria = [ticket.Categoria, ticket.SubCategoria, ticket.SubSubCategoria]
    .filter(Boolean)
    .join(' > ');

  return (
    <div className="detalle-ticket">
      <button className="btn-volver" onClick={onVolver}>← Volver</button>
      <h2>Asunto ticket #{ticket.ID}</h2>

      <div className="fila">
        <div className="campo">
          <label>Asunto</label>
          <span>{ticket.Title}</span>
        </div>
        <div className="campo">
          <label>Categoría</label>
          <span>{categoria || '–'}</span>
        </div>
      </div>

      <div className='fila'>
        <div className="campo">
          <label>Fecha de Apertura</label>
          <span>{ticket.FechaApertura || '–'}</span>
        </div>
        <div className="campo">
          <label>Fecha máxima de solución</label>
          <span>{ticket.TiempoSolucion || '–'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Resolutor del caso</label>
          <span>{ticket.Nombreresolutor || '–'}</span>
        </div>
        <div className="campo">
          <label>Solicitante del ticket</label>
          <span>{ticket.Solicitante || '–'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Descripción del caso</label>
          <span><HtmlContent html={ticket.Descripcion} /></span>
        </div>

        <div className="campo">
          <label>Fuente de solicitud</label>
          <span>{ticket.Fuente || '–'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Estado del caso</label>
          <span>{ticket.Estadodesolicitud || '–'}</span>
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
            role= {role ?? "Usuario"}
            onVolver={() => setShowSeg(false)}
            ticketId={ticket.ID!}
            onAddClick={() => { } }
            onViewClick={() => { } }
          />
        </div>
      )}
    </div>
  );
}
