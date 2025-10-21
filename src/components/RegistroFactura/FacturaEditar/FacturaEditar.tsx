// src/components/RegistrarFactura/FacturaEditar/FacturaEditar.tsx
import React, { useState } from "react";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";
import { FacturaEditar as facturaFx } from "../../../Funcionalidades/FacturaEditar";
import "./FacturaEditar.css";

interface Props {
  factura: ReFactura;
  onClose: () => void;
  onEliminar?: (id: number) => void;
  onGuardar?: () => void;
}

export default function FacturaEditarCompo({ factura, onClose, onEliminar, onGuardar }: Props) {
  const { actualizarFactura, eliminarFactura } = facturaFx();

  // 🆕 Se agregan más campos al estado del formulario
  const [formData, setFormData] = useState({
    proveedor: factura.Proveedor ?? "",
    Title: factura.Title ?? "",
    ValorAnIVA: typeof factura.ValorAnIVA === "number" ? factura.ValorAnIVA : Number(factura.ValorAnIVA) || 0,
    DetalleFac: factura.DetalleFac ?? "",
    CC: factura.CC ?? "", // 🆕 Centro de costo
    CO: factura.CO ?? "", // 🆕 Centro operativo
    un: factura.un ?? "", // 🆕 Unidad de negocio
    DocERP: factura.DocERP ?? "", // 🆕 Documento ERP
    FechaEmision: factura.FechaEmision ?? "", // 🆕 Fecha de emisión
    FecEntregaCont: factura.FecEntregaCont ?? "", // 🆕 Fecha de entrega contabilidad
  });

  // Manejador de cambios — ahora incluye los nuevos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "ValorAnIVA") {
      const n = value === "" ? 0 : Number(value);
      setFormData((prev) => ({ ...prev, ValorAnIVA: Number.isNaN(n) ? 0 : n }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🆕 Incluimos los nuevos campos en el objeto de cambios
    const cambios: Partial<ReFactura> = {
      Proveedor: formData.proveedor,
      Title: formData.Title,
      ValorAnIVA: formData.ValorAnIVA,
      DetalleFac: formData.DetalleFac,
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
          <input name="proveedor" value={formData.proveedor} onChange={handleChange} placeholder="Proveedor" />
          <input name="Title" value={formData.Title} onChange={handleChange} placeholder="NIT / Título" />
          <input name="ValorAnIVA" type="number" value={formData.ValorAnIVA} onChange={handleChange} placeholder="Valor" />
          {/* <textarea name="DetalleFac" value={formData.DetalleFac} onChange={handleChange} placeholder="Detalle"></textarea> */}

          {/* 🆕 Campos nuevos */}
          <input name="CC" value={formData.CC} onChange={handleChange} placeholder="Centro de Costo (CC)" />
          <input name="CO" value={formData.CO} onChange={handleChange} placeholder="Centro Operativo (CO)" />
          <input name="UN" value={formData.un} onChange={handleChange} placeholder="Unidad de Negocio (UN)" />
          
          <label>📅 Fecha de Emisión:
          <input name="FechaEmision" type="date" value={formData.FechaEmision} onChange={handleChange} /></label>
          <label>📅 Fecha Entrega a Contabilidad:
          <input name="FechaEntregaConta" type="date" value={formData.FecEntregaCont} onChange={handleChange} /></label>
          <input name="DocERP" value={formData.DocERP} onChange={handleChange} placeholder="Documento ERP" />

          <div className="modal-buttons">
            <button type="submit" className="btn-guardar">💾 Guardar</button>
            <button type="button" className="btn-cancelar" onClick={onClose}>❌ Cancelar</button>
            <button type="button" className="btn-eliminar" onClick={handleEliminar}>🗑️ Eliminar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
