// src/components/NuevoTicketForm.tsx
import { useState } from 'react';
import './NuevoTicketForm.css';
import Select from 'react-select';

export default function NuevoTicketForm() {
  const [fechaActiva, setFechaActiva] = useState(false);

  
  const usuarios = [
    { value: 'practicantelisto@estudiodemoda.com.co', label: 'Practicante Listo' },
    { value: 'cesar@estudiodemoda.com.co', label: 'Cesar Sanchez' },
    { value: 'elizabeth@estudiodemoda.com.co', label: 'Andres Godoy' },
  ];


  return (
    <div className="ticket-form">
      <h2>Nuevo Ticket</h2>

      <form>
        
        <div className="form-row">
          <div className="form-group inline-group">
            <label>Solicitante</label>
            <Select options={usuarios} placeholder="Buscar solicitante..." />
          </div>

          <div className="form-group inline-group">
            <label>Resolutor</label>
            <Select options={usuarios} placeholder="Buscar resolutor..." />
          </div>
        </div>


        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="fechaApertura"
            checked={fechaActiva}
            onChange={() => setFechaActiva(!fechaActiva)}
          />
          <label htmlFor="fechaApertura">Escoger fecha de apertura</label>
        </div>

        {fechaActiva && (
          <div className="form-group">
            <label>Fecha de apertura</label>
            <input type="date" />
          </div>
        )}

        <div className="form-group">
          <label>Fuente Solicitante</label>
          <select>
            <option value="">Seleccione una fuente</option>
            <option value="correo">Correo</option>
            <option value="teams">Teams</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="presencial">Presencial</option>
          </select>
        </div>

        <div className="form-group">
          <label>Motivo de la solicitud</label>
          <input type="text" placeholder="Ingrese el motivo" />
        </div>

        <div className="form-group">
          <label>Descripción del problema</label>
          <textarea rows={4} placeholder="Describa el problema..." />
        </div>

        <div className='Categorias'>
          <div className='categoria-core'>
            <label>Categoria</label>
            <select className='categoria-select'>
              <option value="">Seleccione una categoria</option>
            </select>
          </div>
          <div className='categoria-core'>
            <label>Subcategoria</label>
            <select className='categoria-select'>
              <option value="">Seleccione una subcategoria</option>
            </select>
          </div>
          <div className='categoria-core'>
            <label>Articulo</label>
            <select className='categoria-select'>
              <option value="">Seleccione una articulo</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Adjuntar archivo</label>
          <input type="file" />
        </div>


        <button type="submit">Enviar Ticket</button>
      </form>
    </div>
  );
}