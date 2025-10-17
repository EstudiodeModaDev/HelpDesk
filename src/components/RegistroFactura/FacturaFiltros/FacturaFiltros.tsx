// src/components/RegistrarFactura/FacturaFiltros.tsx
import React from "react";
import "./FacturaFiltros.css";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";


// 🧠 Interfaz para los props
interface Props {
  filtros: Partial<ReFactura>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function FacturaFiltros({ filtros, onChange }: Props) {
  return (
    <div className="filtros-container">
      <h3>🔍 Filtros de búsqueda</h3>

      <div className="filtros-grid">
        <input
          type="date"
          name="fechadeemision"
          value={filtros.fechadeemision || ""}
          onChange={onChange}
          placeholder="Fecha"
        />

        <input
          type="text"
          name="numerofactura"
          value={filtros.numerofactura || ""}
          onChange={onChange}
          placeholder="Número de factura"
        />

        <input
          type="text"
          name="proveedor"
          value={filtros.proveedor || ""}
          onChange={onChange}
          placeholder="Proveedor"
        />

        <input
          type="text"
          name="Title"
          value={filtros.Title || ""}
          onChange={onChange}
          placeholder="NIT"
        />

        <select
          name="tipodefactura"
          value={filtros.tipodefactura || ""}
          onChange={onChange}
        >
          <option value="">Tipo de factura</option>
          <option value="SC11">SC11</option>
          <option value="SC40">SC40</option>
          <option value="SC41">SC41</option>
          <option value="SC70">SC70</option>
        </select>
      </div>
    </div>
  );
}
