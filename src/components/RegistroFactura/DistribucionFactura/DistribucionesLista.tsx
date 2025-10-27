// src/components/DistribucionFactura/DistribucionesLista.tsx
import React from "react";
import { useDistribucionFactura } from "../../../Funcionalidades/DistribucionFactura";
import "./DistribucionesLista.css"

interface DistribucionesListaProps {
  onVolver: () => void;
}

const DistribucionesLista: React.FC<DistribucionesListaProps> = ({ onVolver }) => {
  const { distribuciones, loading, error } = useDistribucionFactura();

  return (
    <div className="distribuciones-lista-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">📋 Distribuciones registradas</h4>
        <button className="btn btn-secondary" onClick={onVolver}>
          🔙 Volver al formulario
        </button>
      </div>

      {loading && <p>Cargando distribuciones...</p>}
      {error && <p style={{ color: "red" }}>⚠️ {error}</p>}

      {!loading && !error && distribuciones.length === 0 && (
        <p>No hay distribuciones registradas todavía.</p>
      )}

      {!loading && !error && distribuciones.length > 0 && (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>Proveedor</th>
                <th>Título</th>
                <th>N° Factura</th>
                <th>Fecha Emisión</th>
                <th>Costo Total Imp.</th>
                <th>Marcas Nacionales</th>
                <th>Marcas Importadas</th>
                <th>CEDI</th>
                <th>Serv. Admin.</th>
              </tr>
            </thead>
            <tbody>
              {distribuciones.map((item) => (
                <tr key={item.Id ?? item.Id}>
                  <td>{item.Proveedor}</td>
                  <td>{item.Title}</td>
                  <td>{item.NoFactura}</td>
                  <td>{item.FechaEmision}</td>
                  <td>{item.CosToImp?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</td>
                  <td>{item.CosTotMarNacionales?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</td>
                  <td>{item.CosTotMarImpor?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</td>
                  <td>{item.CosTotCEDI?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</td>
                  <td>{item.CosTotServAdmin?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DistribucionesLista;
