import React, { useState, useEffect } from "react";
import "./FacturaFiltros.css";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";

/**
 * 🔎 Componente de filtros reutilizable
 * Recibe una prop `onFiltrar` para comunicar los filtros al padre.
 */
export default function FacturaFiltros({
  onFiltrar,
}: {
  onFiltrar: (filtros: Partial<ReFactura>) => void;
}) {
  const [filtros, setFiltros] = useState<Partial<ReFactura>>({
    FechaEmision: "",
    NoFactura: "",
    Proveedor: "",
    Title: "",
    Items: "",
    DescripItems: "",
  });

  const opcionesFactura = [
    { codigo: "SC11", descripcion: "ARREND. EQ. COMPUTAC Y COMUNICACIÓN" },
    { codigo: "SC40", descripcion: "MMTO. EQ. COMPUTO Y COMU COMPRAS RC" },
    { codigo: "SC41", descripcion: "MMTO. EQ. COMPUTO Y COMU SERVICIOS RC" },
    { codigo: "SC70", descripcion: "UTILES, PAPELERIA Y FOTOCOPIAS RC" },
    { codigo: "SC80", descripcion: "SERVICIO DE TELEFONIA" },
  ];

  // 🔁 Llama automáticamente al padre cada vez que cambian los filtros
  useEffect(() => {
    onFiltrar(filtros);
  }, [filtros]);

  // 🧠 Actualiza los filtros locales
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
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

  return (
    <div className="filtros-container">
      <h3>🔍 Filtros de búsqueda</h3>

      <div className="filtros-grid">
          <label>
            Fecha de emisión
            <input
              type="date"
              name="FechaEmision"
              value={filtros.FechaEmision || ""}
              onChange={handleChange}
            />
          </label>

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

        {/* 🧾 Selector de ítem */}
        <select name="Items" value={filtros.Items || ""} onChange={handleChange}>
          <option value="">Seleccionar código</option>
          {opcionesFactura.map((op) => (
            <option key={op.codigo} value={op.codigo}>
              {op.codigo} - {op.descripcion}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="DescripItems"
          value={filtros.DescripItems || ""}
          readOnly
          placeholder="Descripción del ítem"
        />

        <label>
          Fecha entrega cont
          <input
            type="date"
            name="FecEntregaCont"
            value={filtros.FecEntregaCont || ""}
            onChange={handleChange}
          />
        </label>

          <input
          type="text"
          name="DocERP"
          value={filtros.DocERP || ""}
          readOnly
          placeholder="Doc ERP"
        />


      </div>
    </div>
  );
}
