import React, { useState } from "react";
import type { DistribucionFacturaData } from "../../../Models/DistribucionFactura";
import { DistribucionFacturaService } from "../../../Services/DistribucionFactura.service";
import { FacturasService } from "../../../Services/Facturas.service";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import "./DistribucionFacturaEditar.css";

interface Props {
  distribucion: DistribucionFacturaData;
  onClose: () => void;
  onGuardar?: () => void;
  onEliminar?: (id: string) => void;
}

export default function DistribucionFacturaEditar({
  distribucion,
  onClose,
  onGuardar,
  onEliminar,
}: Props) {
  const { graph } = useGraphServices();
  const serviceDist = new DistribucionFacturaService(graph);
  const serviceFact = new FacturasService(graph);

  const [formData, setFormData] = useState({
    FechaEmision: distribucion.FechaEmision
      ? new Date(distribucion.FechaEmision).toISOString().split("T")[0]
      : "",
    NoFactura: distribucion.NoFactura ?? "",
    CargoFijo: distribucion.CargoFijo ?? 0,
    ImpBnCedi: distribucion.ImpBnCedi ?? 0,
    ImpBnPalms: distribucion.ImpBnPalms ?? 0,
    ImpColorPalms: distribucion.ImpColorPalms ?? 0,
    ImpBnCalle: distribucion.ImpBnCalle ?? 0,
    ImpColorCalle: distribucion.ImpColorCalle ?? 0,
  });

  const setField = <K extends keyof typeof formData>(
    k: K,
    v: typeof formData[K]
  ) => setFormData((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!distribucion.Id) {
      console.error("❌ No se encontró Id del registro de distribución.");
      alert("No se puede actualizar: falta el Id del registro.");
      return;
    }

    try {
      // 🔹 Actualizar en DistribuciónFactura
      const cambiosDist: Partial<DistribucionFacturaData> = {
        FechaEmision: formData.FechaEmision,
        NoFactura: formData.NoFactura,
        CargoFijo: Number(formData.CargoFijo),
        ImpBnCedi: Number(formData.ImpBnCedi),
        ImpBnPalms: Number(formData.ImpBnPalms),
        ImpColorPalms: Number(formData.ImpColorPalms),
        ImpBnCalle: Number(formData.ImpBnCalle),
        ImpColorCalle: Number(formData.ImpColorCalle),
      };

      await serviceDist.update(distribucion.Id, cambiosDist);

      // 🔹 Intentar actualizar también en Facturas (si existe vínculo)
      try {
        const posiblesFacturas = await serviceFact.getAll({
          filter: `fields/NoFactura eq '${formData.NoFactura}'`,
        });

        const facturaRelacionada = posiblesFacturas.items?.[0];

        if (facturaRelacionada?.id0 != null) {
          const cambiosFactura = {
            FechaEmision: formData.FechaEmision,
            NoFactura: formData.NoFactura,
            CargoFijo: Number(formData.CargoFijo),
          };
          await serviceFact.update(String(facturaRelacionada.id0), cambiosFactura);
        }
      } catch (err) {
        console.warn(
          "⚠️ No se encontró factura relacionada, solo se actualizó la distribución."
        );
      }

      onGuardar?.();
      onClose();
    } catch (err) {
      console.error("❌ Error al actualizar distribución:", err);
      alert("Error al actualizar la distribución. Revisa la consola para más detalles.");
    }
  };

  const handleEliminar = async () => {
    if (!distribucion.Id) {
      console.error("❌ No se encontró Id del registro de distribución.");
      alert("No se puede eliminar: falta el Id del registro.");
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro deseas eliminar el registro de distribución?`
    );
    if (!confirmar) return;

    try {
      await serviceDist.delete(distribucion.Id);
      onEliminar?.(distribucion.Id);
      onClose();
    } catch (err) {
      console.error("❌ Error al eliminar distribución:", err);
      alert("Error al eliminar la distribución.");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>✏️ Editar Distribución #{distribucion.NoFactura}</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Fecha de Emisión:
            <input
              type="date"
              value={formData.FechaEmision}
              onChange={(e) => setField("FechaEmision", e.target.value)}
            />
          </label>

          <label>
            No. Factura:
            <input
              type="text"
              value={formData.NoFactura}
              onChange={(e) => setField("NoFactura", e.target.value)}
              placeholder="Número de factura"
            />
          </label>

          <label>
            Cargo Fijo:
            <input
              type="number"
              value={formData.CargoFijo}
              onChange={(e) => setField("CargoFijo", Number(e.target.value))}
            />
          </label>

          <h4>🖨️ Valores de Impresiones</h4>

          <label>
            Imp. B/N CEDI:
            <input
              type="number"
              value={formData.ImpBnCedi}
              onChange={(e) => setField("ImpBnCedi", Number(e.target.value))}
            />
          </label>

          <label>
            Imp. B/N Palms:
            <input
              type="number"
              value={formData.ImpBnPalms}
              onChange={(e) => setField("ImpBnPalms", Number(e.target.value))}
            />
          </label>

          <label>
            Imp. Color Palms:
            <input
              type="number"
              value={formData.ImpColorPalms}
              onChange={(e) =>
                setField("ImpColorPalms", Number(e.target.value))
              }
            />
          </label>

          <label>
            Imp. B/N Calle:
            <input
              type="number"
              value={formData.ImpBnCalle}
              onChange={(e) => setField("ImpBnCalle", Number(e.target.value))}
            />
          </label>

          <label>
            Imp. Color Calle:
            <input
              type="number"
              value={formData.ImpColorCalle}
              onChange={(e) => setField("ImpColorCalle", Number(e.target.value))}
            />
          </label>

          <div className="modal-buttons">
            <button type="submit" className="btn-guardar">
              ✅ Guardar
            </button>
            <button
              type="button"
              className="btn-cancelar"
              onClick={onClose}
            >
              ❌ Cancelar
            </button>
            <button
              type="button"
              className="btn-eliminar"
              onClick={handleEliminar}
            >
              🗑️ Eliminar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
