// src/components/DetallesTickets/DetalleTicket.tsx
import * as React from 'react';
import type { Ticket } from '../../Models/Tickets';
import './DetalleTicket.css';
import TicketHistorial from '../Seguimiento/Seguimiento'; // ajusta la ruta si es necesario

type Rol = 'admin' | 'tecnico' | 'usuario';

// Tipo de mensaje del historial
type Mensaje = {
  id: string | number;
  autorNombre: string;
  autorAvatarUrl?: string;
  fechaISO: string;     // ISO
  titulo?: string;
  texto: string;
  tipo: 'seguimiento' | 'solucion' | 'sistema';
};

export default function DetalleTicket({
  ticket,
  onVolver,
  role = 'admin',
  fetchMensajes,
}: {
  ticket: Ticket;
  onVolver: () => void;
  role?: Rol;
  fetchMensajes?: (ticketId: number | string) => Promise<Mensaje[]>;
}) {
  if (!ticket) return <div>Ticket no encontrado</div>;

  const categoria = [ticket.Categoria, ticket.Subcategoria, ticket.Articulo]
    .filter(Boolean)
    .join(' > ');

  // Estado para mostrar/ocultar el bloque de seguimiento
  const [showSeg, setShowSeg] = React.useState(false);
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);
  const [loadingSeg, setLoadingSeg] = React.useState(false);
  const [errSeg, setErrSeg] = React.useState<string | null>(null);

  // Alternar el panel de seguimiento
  const handleOpenSeguimiento = async () => {
    setShowSeg((v) => !v);
  };

  // Cargar historial cuando se abra el panel (si provees fetchMensajes)
  React.useEffect(() => {
    const load = async () => {
      if (!showSeg) return;
      if (mensajes.length > 0 || !fetchMensajes) return;

      setLoadingSeg(true);
      setErrSeg(null);
      try {
        const data = await fetchMensajes(ticket.id);
        setMensajes(data);
      } catch (e: any) {
        setErrSeg(e?.message ?? 'No se pudo cargar el historial');
      } finally {
        setLoadingSeg(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSeg, fetchMensajes, ticket?.id]);

  // Fallback: si no pasas fetchMensajes, muestro un ejemplo mínimo
  const mensajesFallback: Mensaje[] = React.useMemo(
    () => [
      {
        id: 'sys-1',
        autorNombre: 'Sistema',
        fechaISO: new Date().toISOString(),
        titulo: 'Asignamiento de resolutor',
        texto: '',
        tipo: 'sistema',
      },
      {
        id: 'u-1',
        autorNombre: ticket.resolutor || 'Resolutor',
        fechaISO: new Date().toISOString(),
        titulo: ticket.Title || 'Sin asunto',
        texto: ticket.Descripcion || '',
        tipo: 'solucion',
      },
    ],
    [ticket]
  );

  const visibles = fetchMensajes ? mensajes : mensajesFallback;

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

      <div className="fila">
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

      {/* Botón para mostrar/ocultar el seguimiento */}
      <div style={{ marginTop: 12 }}>
        <button className="btn-volver" onClick={handleOpenSeguimiento}>
          {showSeg ? 'Ocultar seguimiento' : 'Seguimiento ticket'}
        </button>
      </div>

      {/* Bloque de seguimiento embebido */}
      {showSeg && (
        <div style={{ marginTop: 16 }}>
          {loadingSeg && <p>Cargando historial…</p>}
          {errSeg && <p style={{ color: '#b91c1c' }}>{errSeg}</p>}

          {!loadingSeg && !errSeg && (
            <TicketHistorial
              role={role}                  // controla visibilidad de botones (admin/tecnico)
              mensajes={visibles}          // desde API o fallback
              onVolver={() => setShowSeg(false)} // cierra el bloque
              onAddClick={(m) => console.log('Agregar sobre:', m)}
              onViewClick={(m) => console.log('Ver detalle de:', m)}
              defaultTab="solucion"
            />
          )}
        </div>
      )}
    </div>
  );
}
