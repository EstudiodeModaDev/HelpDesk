// src/components/RegistrarFactura/FacturaEditar/FacturaEditar.tsx
import React, { useState } from "react";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";
import { FacturaEditar as facturaFx } from "../../../Funcionalidades/FacturaEditar";

// Props del componente
interface Props {
  factura: ReFactura;
  onClose: () => void;
}

/**
 * Componente visual: modal para editar una factura.
 * - Usa la lógica de Funcionalidades/FacturaEditar (renombrada aquí como facturaFx).
 * - Asegura que `valor` sea number y usa `id0` como identificador.
 */
export default function FacturaEditarCompo({ factura, onClose }: Props) {
  // obtenemos la función lógica (actualizar/eliminar...) desde funcionalidades
  const { actualizarFactura } = facturaFx();

  // definimos el tipo del estado del formulario (valor siempre number)
  const [formData, setFormData] = useState<{
    proveedor: string;
    Title: string;
    valor: number;
    detalle: string;
  }>({
    proveedor: factura.proveedor ?? "",
    Title: factura.Title ?? "",
    valor: typeof factura.valor === "number" ? factura.valor : Number(factura.valor) || 0,
    detalle: factura.detalle ?? "",
  });

  // Manejador de cambios: parsea 'valor' a número
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // si el campo es 'valor' convertimos a número (si no es numérico, queda 0)
    if (name === "valor") {
      const n = value === "" ? 0 : Number(value);
      setFormData((prev) => ({ ...prev, valor: Number.isNaN(n) ? 0 : n }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Envío del formulario: construye cambios como Partial<ReFactura> y pasa id0
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Construimos el objeto con los cambios — tipo Partial<ReFactura>
    const cambios: Partial<ReFactura> = {
      proveedor: formData.proveedor,
      Title: formData.Title,
      valor: formData.valor,
      detalle: formData.detalle,
      // No sobreescribimos id0 ni fechas/números a menos que quieras
    };

    // Usar id0 (tu modelo lo tiene). Si no existe id0, abortamos con error controlado.
    const id = factura.id0;
    if (id == null) {
      console.error("No se encontró id0 en la factura. No se puede actualizar.");
      return;
    }

    // Llamada a la lógica que actualiza (espera id, cambios)
    const ok = await actualizarFactura(id, cambios);
    if (ok) onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>✏️ Editar Factura #{factura.numerofactura}</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            name="proveedor"
            value={formData.proveedor}
            onChange={handleChange}
            placeholder="Proveedor"
          />
          <input
            name="Title"
            value={formData.Title}
            onChange={handleChange}
            placeholder="NIT / Título"
          />
          <input
            name="valor"
            type="number"
            value={formData.valor}
            onChange={handleChange}
            placeholder="Valor"
          />
          <textarea
            name="detalle"
            value={formData.detalle}
            onChange={handleChange}
            placeholder="Detalle"
          ></textarea>

          <div className="modal-buttons">
            <button type="submit" className="btn-guardar">💾 Guardar</button>
            <button type="button" className="btn-cancelar" onClick={onClose}>❌ Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
