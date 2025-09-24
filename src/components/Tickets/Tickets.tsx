import { useState } from 'react';
import DetalleTicket from '../DetallesTickets/DetallesTickets';
import './Tickets.css';
import {calcularColorEstado, parseFecha} from '../../Funcionalidades/Tickets';
import type { Ticket } from '../../Models/Tickets';

const tickets: Ticket[] = [
  {
    id: '2007',
    resolutor: 'Juan David Chavarria Mesa',
    solicitante: 'Aprendiz Capital Humano',
    Title: 'Revisión de impresora',
    apertura: '25/09/2025 8:56',
    maxima: '25/09/2025 16:56',
    estado: 'En atención',
    categoria: 'Siesa',
    subcategoria: 'POS',
    articulo: '',
    descripcion: 'Caso de prueba',
    fuente: 'Correo'
  },
  {
    id: '2005',
    resolutor: 'Juan David Chavarria Mesa',
    solicitante: 'Pilatos Caribe Plaza Cartagena',
    Title: 'tienda sin internet',
    apertura: '19/09/2025 18:11',
    maxima: '24/09/2025 18:11',
    estado: 'red',
  },
  {
    id: '2003',
    resolutor: 'Juan David Chavarria Mesa',
    solicitante: 'Repoly Tesoro',
    Title: 'CPU/Puerto para reproducir sonido',
    apertura: '19/09/2025 9:27',
    maxima: '',
    estado: '',
  },
  {
    id: '2002',
    resolutor: 'Andres Felipe Godoy Pastrana',
    solicitante: 'Natalia Londoño Acebedo',
    Title: 'AYUDA ADOBE PDF',
    apertura: '',
    maxima: '',
    estado: 'red',
  },
];

export default function TablaTickets() {
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);

    const filtrarTickets = tickets.filter((ticket) => {
    // ✅ Template string con backticks y campos correctos + null-coalescing
    const texto = `${ticket.resolutor ?? ''} ${ticket.solicitante ?? ''} ${ticket.Title ?? ''}`.toLowerCase();
    const coincideTexto = texto.includes(search.toLowerCase());

    const fechaMaxima = ticket.maxima ? parseFecha(ticket.maxima) : null;
    const desde = fechaInicio ? new Date(fechaInicio) : null;
    const hasta = fechaFin ? new Date(fechaFin) : null;

    const coincideFecha =
        !fechaMaxima ||
        (!desde && !hasta) ||
        (desde && fechaMaxima >= desde) ||
        (hasta && fechaMaxima <= hasta) ||
        (desde && hasta && fechaMaxima >= desde && fechaMaxima <= hasta);

    return coincideTexto && coincideFecha;
    });

  const resetFiltros = () => {
    setSearch('');
    setFechaInicio('');
    setFechaFin('');
  };

  return (
    <div className="tabla-tickets">
      <h2>Listado de Tickets</h2>

      {!ticketSeleccionado && (
        <div className="filtros">
          <input
            type="text"
            placeholder="Buscar Tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <span>→</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
          <button onClick={resetFiltros}>⟳</button>
        </div>
      )}

      {ticketSeleccionado ? (
        <DetalleTicket ticket={ticketSeleccionado} onVolver={() => setTicketSeleccionado(null)} />
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Resolutor</th>
              <th>Solicitante</th>
              <th>Asunto</th>
              <th>Fecha de apertura</th>
              <th>Fecha máxima</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrarTickets.map((ticket) => (
              <tr key={ticket.id} onClick={() => setTicketSeleccionado(ticket)} style={{ cursor: 'pointer' }}>
                <td>{ticket.id}</td>
                <td>{ticket.resolutor}</td>
                <td>{ticket.solicitante}</td>
                <td>{ticket.Title}</td>
                <td>{ticket.apertura || '–'}</td>
                <td>{ticket.maxima || '–'}</td>
                <td>
                  <span
                    className="estado-circulo"
                    style={{ backgroundColor: calcularColorEstado(ticket) }}
                    title={ticket.estado}
                  ></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}