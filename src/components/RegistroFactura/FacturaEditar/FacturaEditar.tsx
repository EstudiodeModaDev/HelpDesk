// src/components/RegistrarFactura/FacturaEditar/FacturaEditar.tsx
import React, { useState } from "react";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";
import { FacturaEditar as facturaFx } from "../../../Funcionalidades/FacturaEditar";
import "./FacturaEditar.css";
import { opcionescc, opcionesco, opcionesFactura, opcionesun } from "../RegistroFactura";

interface Props {
  factura: ReFactura;
  onClose: () => void;
  onEliminar?: (id: number) => void;
  onGuardar?: () => void;
}

export default function FacturaEditarCompo({ factura, onClose, onEliminar, onGuardar }: Props) {
  const { actualizarFactura, eliminarFactura } = facturaFx();

// Manejador de cambios — ahora incluye los nuevos campos
// 🧠 Manejador de cambios — soporta input, textarea y select
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const { name, value } = e.target;

  // 🧾 Si el campo es numérico (ValorAnIVA)
  if (name === "ValorAnIVA") {
    const n = value === "" ? 0 : Number(value);
    setFormData((prev) => ({
      ...prev,
      ValorAnIVA: Number.isNaN(n) ? 0 : n,
    }));
    return;
  }

  // 🏷️ Si el campo pertenece a los select (CC, CO o un)
  if (name === "CC" || name === "CO" || name === "un" || name === "Items") {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    return;
  }

  // 📦 Por defecto: manejar cualquier input o textarea
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};



  
  // 🆕 Se agregan más campos al estado del formulario
  const [formData, setFormData] = useState({
    proveedor: factura.Proveedor ?? "",
    Title: factura.Title ?? "",
    ValorAnIVA: typeof factura.ValorAnIVA === "number" ? factura.ValorAnIVA : Number(factura.ValorAnIVA) || 0,
    DetalleFac: factura.DetalleFac ?? "",
    Items: factura.Items ?? "", //items
    CC: factura.CC ?? "", // 🆕 Centro de costo
    CO: factura.CO ?? "", // 🆕 Centro operativo
    un: factura.un ?? "", // 🆕 Unidad de negocio
    DocERP: factura.DocERP ?? "", // 🆕 Documento ERP
    FechaEmision: factura.FechaEmision
    ? new Date(factura.FechaEmision).toISOString().split("T")[0]
    : "", // ✅ transforma a yyyy-MM-dd // 🆕 Fecha de emisión
    
    FecEntregaCont: factura.FecEntregaCont
    ? new Date(factura.FecEntregaCont).toISOString().split("T")[0]
    : "", // ✅ igual aquí // 🆕 Fecha de entrega contabilidad
  });

  


  // Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🆕 Incluimos los nuevos campos en el objeto de cambios
    const cambios: Partial<ReFactura> = {
      Proveedor: formData.proveedor,
      Title: formData.Title,
      ValorAnIVA: formData.ValorAnIVA,
      DetalleFac: formData.DetalleFac,
      Items: formData.Items,
      CC: formData.CC,
      CO: formData.CO,
      un: formData.un,
      DocERP: formData.DocERP,
      FechaEmision: formData.FechaEmision,
      FecEntregaCont: formData.FecEntregaCont,
    };

    const id = factura.id0;
    if (id == null) {
      console.error("No se encontró id0 en la factura. No se puede actualizar.");
      return;
    }

    const ok = await actualizarFactura(id, cambios);
    if (ok) {
      onGuardar?.();
      onClose();
    }
  };

  // 🗑️ Eliminar factura (sin cambios)
  const handleEliminar = async () => {
    const id = factura.id0;
    if (id == null) {
      console.error("No se encontró id0 en la factura. No se puede eliminar.");
      return;
    }

    const confirmar = window.confirm(`¿Seguro deseas eliminar la factura #${factura.NoFactura}?`);
    if (!confirmar) return;

    const ok = await eliminarFactura(id);
    if (ok) {
      onEliminar?.(id);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>✏️ Editar Factura #{factura.NoFactura}</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Campos originales */}
          <label> Proveedor:
          <input name="proveedor" value={formData.proveedor} onChange={handleChange} placeholder="Proveedor" /></label>
          <label> NIT:
          <input name="Title" value={formData.Title} onChange={handleChange} placeholder="NIT / Título" /></label>
          <label> ValorAnIva:
          <input name="ValorAnIVA" type="number" value={formData.ValorAnIVA} onChange={handleChange} placeholder="Valor" /></label>
          {/* <textarea name="DetalleFac" value={formData.DetalleFac} onChange={handleChange} placeholder="Detalle"></textarea> */}

          {/* 🆕 Campos nuevos */}
          <label> Items:
          <select name="Items" value={formData.Items} onChange={handleChange} required> <option value="">Seleccionar centro de costo</option>
                {opcionesFactura.map((of) => (
                  <option key={of.codigo} value={of.codigo}>
                    {of.codigo} - {of.descripcion}
                  </option>
                ))}
              </select></label>

          <label> C.C:
          <select name="CC" value={formData.CC} onChange={handleChange} required> <option value="">Seleccionar centro de costo</option>
                {opcionescc.map((cc) => (
                  <option key={cc.codigo} value={cc.codigo}>
                    {cc.codigo} - {cc.descripcion}
                  </option>
                ))}
              </select></label>

          <label> C.O:
          <select name="CO" value={formData.CO} onChange={handleChange} required> <option value="">Seleccionar centro operativo</option>
                {opcionesco.map((co) => (
                  <option key={co.codigo} value={co.codigo}>
                    {co.codigo} - {co.descripcion}
                  </option>
                ))}
              </select></label>

          <label> U.N:
          <select name="UN" value={formData.un} onChange={handleChange} required> <option value="">Seleccionar unidad de negocio</option>
                {opcionesun.map((un) => (
                  <option key={un.codigo} value={un.codigo}>
                    {un.codigo} - {un.descripcion}
                  </option>
                ))}
              </select></label>
          
          <label> Fecha de Emisión:
          <input name="FechaEmision" type="date" value={formData.FechaEmision} onChange={handleChange} /></label>
          <label> Fecha Entrega a Contabilidad:
          <input name="FechaEntregaConta" type="date" value={formData.FecEntregaCont} onChange={handleChange} /></label>
          <label> Doc ERP:
          <input name="DocERP" value={formData.DocERP} onChange={handleChange} placeholder="Documento ERP" /></label>

          <div className="modal-buttons">
            <button type="submit" className="btn-guardar">✅ Guardar</button>
            <button type="button" className="btn-cancelar" onClick={onClose}>❌ Cancelar</button>
            <button type="button" className="btn-eliminar" onClick={handleEliminar}>🗑️ Eliminar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
