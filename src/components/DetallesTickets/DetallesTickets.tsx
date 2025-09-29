import type { Ticket } from '../../Models/Tickets';
import './DetalleTicket.css';


export default function DetalleTicket({ ticket, onVolver }: { ticket: Ticket, onVolver: () => void }) {
  if (!ticket) return <div>Ticket no encontrado</div>;

  const categoria = [ticket.Categoria, ticket.Subcategoria, ticket.Articulo]
    .filter(Boolean)
    .join(' > ');

  return (
    <div className="detalle-ticket">
      <button className="btn-volver" onClick={onVolver}>← Volver</button>
      <h2>Asunto ticket #{ticket.id}</h2>

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
          <span>{ticket.resolutor || '–'}</span>
        </div>
        <div className="campo">
          <label>Solicitante del ticket</label>
          <span>{ticket.solicitante || '–'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Descripción del caso</label>
          <span>{ticket.Descripcion || '–'}</span>
        </div>

        <div className="campo">
          <label>Fuente de solicitud</label>
          <span>{ticket.Fuente || '–'}</span>
        </div>
      </div>

      <div className="fila">
        <div className="campo">
          <label>Estado del caso</label>
          <span>{ticket.estado || '–'}</span>
        </div>
      </div>

      {/* TODO: Poner los casos asociados*/}

       <div><button className="btn-volver">Seguimiento ticket</button></div>

    </div>
  );
}