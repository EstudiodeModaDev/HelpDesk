import React, { useState } from "react";
import { useFacturas } from "../../Funcionalidades/RegistrarFactura";
import FacturasLista from "./FacturasLista/FacturasLista";
//import FacturaFiltros from "./FacturaFiltros/FacturaFiltros";
import type { ReFactura } from "../../Models/RegistroFacturaInterface";
import "./RegistroFactura.css"

// 🧾 Componente principal del registro de facturas
export default function RegistroFactura() {
  // Hook que maneja la lógica de negocio
  const { registrarFactura } = useFacturas();

  // Estado para alternar entre formulario y lista
  const [mostrarLista, setMostrarLista] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState<ReFactura>({
    FechaEmision: "",
    NoFactura: "",
    Proveedor: "",
    Title: "",
    tipodefactura: "",
    Items: "",
    DescripItems: "",
    ValorAnIVA: 0,
    CC: "",
    CO: "",
    un: "",
    DetalleFac: "",
  });

  // Cambios en los inputs
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "valor" ? Number(value) : value,
    }));
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await registrarFactura(formData);
    alert("✅ Factura registrada con éxito");

    // Limpiar campos
    setFormData({
      FechaEmision: "",
      NoFactura: "",
      Proveedor: "",
      Title: "",
      tipodefactura: "",
      Items: "",
      DescripItems: "",
      ValorAnIVA: 0,
      CC: "",
      CO: "",
      un: "",
      DetalleFac: "",
    });
  };

  // Render
  return (
    <div className="registro-container">
      <h2>{mostrarLista ? "📄 Facturas Registradas" : "Registro de Facturas"}</h2>

      {!mostrarLista ? (
        <form className="registro-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* 📆 Fecha de emisión */}
            <div className="campo">
              <label>
                Fecha de emisión
                <input
                  type="date"
                  name="FechaEmision"
                  value={formData.FechaEmision}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* 🔢 Número de factura */}
            <div className="campo">
              <label>
                No. Factura
                <input
                  type="number"
                  name="NoFactura"
                  value={formData.NoFactura}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* 🏢 Proveedor */}
            <div className="campo">
              <label>
                Proveedor
                <input
                  type="text"
                  name="Proveedor"
                  value={formData.Proveedor}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* 🧾 NIT */}
            <div className="campo">
              <label>
                NIT
                <input
                  type="number"
                  name="Title"
                  value={formData.Title}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* 🧩 Tipo de Factura */}
            <div className="campo">
              <label>
                Tipo de Factura
                <select
                  name="tipodefactura"
                  value={formData.tipodefactura}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="SC11">
                    SC11 - Arrend. Eq. Computación y Comunicación
                  </option>
                  <option value="SC40">
                    SC40 - Mnto. Eq. Cómputo y Comunicación Compras RC
                  </option>
                  <option value="SC41">
                    SC41 - Mnto. Eq. Cómputo y Comunicación Servicios RC
                  </option>
                  <option value="SC70">
                    SC70 - Útiles, Papelería y Fotocopias RC
                  </option>
                </select>
              </label>
            </div>

            {/* 🧾 Ítem */}
            <div className="campo">
              <label>
                Ítem
                <input
                  type="text"
                  name="Items"
                  value={formData.Items}
                  onChange={handleChange}
                />
              </label>
            </div>

            {/* 📝 Descripción del ítem */}
            <div className="campo full-width">
              <label>
                Descripción del ítem
                <textarea
                  name="DescripItems"
                  rows={3}
                  value={formData.DescripItems}
                  onChange={handleChange}
                ></textarea>
              </label>
            </div>

            {/* 💰 Valor */}
            <div className="campo">
              <label>
                Valor (en pesos)
                <input
                  type="number"
                  name="ValorAnIVA"
                  placeholder="Ej: $100000"
                  value={formData.ValorAnIVA || ""}
                  onChange={handleChange}
                />
              </label>
            </div>

            {/* 🏢 Centro Costos */}
            <div className="campo">
              <label>
                Centro Costos (C.C)
                <input
                  type="text"
                  name="CC"
                  value={formData.CC}
                  onChange={handleChange}
                />
              </label>
            </div>

            {/* 🏭 Centro Operativo */}
            <div className="campo">
              <label>
                Centro Operativo (C.O)
                <input
                  type="text"
                  name="CO"
                  value={formData.CO}
                  onChange={handleChange}
                />
              </label>
            </div>

            {/* 🧱 Unidad de Negocio */}
            <div className="campo">
              <label>
                Unidad de Negocio (U.N)
                <input
                  type="text"
                  name="un"
                  value={formData.un}
                  onChange={handleChange}
                />
              </label>
            </div>

            {/* 🧾 Detalle */}
            <div className="campo full-width">
              <label>
                Detalle
                <textarea
                  name="DetalleFac"
                  rows={3}
                  value={formData.DetalleFac}
                  onChange={handleChange}
                ></textarea>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="botones-container">
            <button type="submit" className="btn-registrar">
              💾 Registrar Factura
            </button>

            <button
              type="button"
              className="btn-ver-facturas"
              onClick={() => setMostrarLista(true)}
            >
              📄 Mostrar Facturas
            </button>
          </div>
        </form>
      ) : (
        // 📋 Vista de facturas con su propio componente de filtros
        <div>
          
          <FacturasLista onVolver={() => setMostrarLista(false)} />
        </div>
      )}
    </div>
  );
}
