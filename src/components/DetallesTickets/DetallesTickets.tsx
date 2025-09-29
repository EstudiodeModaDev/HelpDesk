// src/components/DetallesTickets/DetalleTicket.tsx
import * as React from 'react';
import type { Ticket } from '../../Models/Tickets';
import './DetalleTicket.css';
import TicketHistorial from '../Seguimiento/Seguimiento';
import { useTicketLogs } from '../../Funcionalidades/Log';      // ← importa el hook
import { useGraphServices } from '../../graph/GrapServicesContext'; // o donde obtienes LogSvc

type Rol = 'admin' | 'tecnico' | 'usuario';

export default function DetalleTicket({
  ticket,
  onVolver,
  role = 'admin',
}: {
  ticket: Ticket;
  onVolver: () => void;
  role?: Rol;
}) {
  if (!ticket) return <div>Ticket no encontrado</div>;

  //const categoria = [ticket.Categoria, ticket.Subcategoria, ticket.Articulo].filter(Boolean).join(' > ');

  // 1) Obtén el servicio y crea el hook
  const { Log } = useGraphServices();        
  const {rows: logs, loading, error, loadFor, currentTicketId } = useTicketLogs(Log);                        

  // 2) Toggle del panel
  const [showSeg, setShowSeg] = React.useState(false);
  const handleOpenSeguimiento = () => {
    const next = !showSeg;
    setShowSeg(next);
    // 3) Al abrir, carga los logs del ticket (solo si no están ya cargados)
    if (next && currentTicketId !== String(ticket.id)) {
      void loadFor(String(ticket.id));
    }
  };

  return (
    <div className="detalle-ticket">
      <button className="btn-volver" onClick={onVolver}>← Volver</button>
      <h2>Asunto ticket #{ticket.id}</h2>

      {/* ... tus filas de metadata igual que antes ... */}

      <div style={{ marginTop: 12 }}>
        <button className="btn-volver" onClick={handleOpenSeguimiento}>
          {showSeg ? 'Ocultar seguimiento' : 'Seguimiento ticket'}
        </button>
      </div>

      {showSeg && (
        <div style={{ marginTop: 16 }}>
          {loading && <p>Cargando historial…</p>}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}

          {!loading && !error && (
            <>
              <TicketHistorial
                role={role}
                mensajes={logs.map(l => ({
                  id: l.Id,
                  autorNombre: l.Actor ?? 'Sistema',
                 // autorAvatarUrl: l.,
                  fechaISO: l.Created ?? "",
                  titulo: l.Title,
                  texto: l.Descripcion ?? '',
                  tipo: (l.Tipo_de_accion as any) ?? 'seguimiento',
                }))}
                onVolver={() => setShowSeg(false)}
                onAddClick={(m) => console.log('Agregar sobre:', m)}
                onViewClick={(m) => console.log('Ver detalle de:', m)}
                defaultTab="solucion"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
