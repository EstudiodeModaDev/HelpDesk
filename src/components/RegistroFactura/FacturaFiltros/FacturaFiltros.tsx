// src/components/RegistrarFactura/FacturaFiltros.tsx
import React, { useState } from "react";
import "./FacturaFiltros.css";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";

export default function FacturaFiltros() {
  // 🔍 Estado interno para manejar los filtros
  const [filtros, setFiltros] = useState<Partial<ReFactura>>({
    FechaEmision: "",
    NoFactura: "",
    Proveedor: "",
    Title: "",
    tipodefactura: "",
  });

  // 🧠 Maneja los cambios dentro del mismo componente
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="filtros-container">
      <h3>🔍 Filtros de búsqueda</h3>

      <div className="filtros-grid">
        <input
          type="date"
          name="fechadeemision"
          value={filtros.FechaEmision || ""}
          onChange={handleChange}
          placeholder="Fecha"
        />

        <input
          type="text"
          name="numerofactura"
          value={filtros.NoFactura || ""}
          onChange={handleChange}
          placeholder="Número de factura"
        />

        <input
          type="text"
          name="proveedor"
          value={filtros.Proveedor || ""}
          onChange={handleChange}
          placeholder="Proveedor"
        />

        <input
          type="text"
          name="Title"
          value={filtros.Title || ""}
          onChange={handleChange}
          placeholder="NIT"
        />

        <select
          name="tipodefactura"
          value={filtros.tipodefactura || ""}
          onChange={handleChange}
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
