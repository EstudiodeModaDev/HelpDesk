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
    Items: "",
    DescripItems: "",
  });

  // 📘 Diccionario de opciones (mismo que en el registro principal)
  const opcionesFactura = [
    { codigo: "SC11", descripcion: "ARREND. EQ. COMPUTAC Y COMUNICACIÓN" },
    { codigo: "SC40", descripcion: "MMTO. EQ. COMPUTO Y COMU COMPRAS RC" },
    { codigo: "SC41", descripcion: "MMTO. EQ. COMPUTO Y COMU SERVICIOS RC" },
    { codigo: "SC70", descripcion: "UTILES, PAPELERIA Y FOTOCOPIAS RC" },
    { codigo: "SC80", descripcion: "SERVICIO DE TELEFONIA" },
  ];

  // 🧠 Maneja los cambios dentro del mismo componente
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Si cambia el ítem, también actualiza la descripción automáticamente
    if (name === "Items") {
      const seleccion = opcionesFactura.find((o) => o.codigo === value);
      setFiltros((prev) => ({
        ...prev,
        Items: value,
        DescripItems: seleccion ? seleccion.descripcion : "",
      }));
    } else {
      setFiltros((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 🧩 Renderizado
  return (
    <div className="filtros-container">
      <h3>🔍 Filtros de búsqueda</h3>

      <div className="filtros-grid">
        <input
          type="date"
          name="FechaEmision"
          value={filtros.FechaEmision || ""}
          onChange={handleChange}
          placeholder="Fecha"
        />

        <input
          type="text"
          name="NoFactura"
          value={filtros.NoFactura || ""}
          onChange={handleChange}
          placeholder="Número de factura"
        />

        <input
          type="text"
          name="Proveedor"
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

        {/* 🧾 Ítem (Código + descripción automática) */}
        <select
          name="Items"
          value={filtros.Items || ""}
          onChange={handleChange}
        >
          <option value="">Seleccionar código</option>
          {opcionesFactura.map((op) => (
            <option key={op.codigo} value={op.codigo}>
              {op.codigo} - {op.descripcion}
            </option>
          ))}
        </select>

        {/* 📝 Descripción del ítem (solo lectura) */}
        <input
          type="text"
          name="DescripItems"
          value={filtros.DescripItems || ""}
          readOnly
          placeholder="Descripción del ítem"
        />
      </div>
    </div>
  );
}
