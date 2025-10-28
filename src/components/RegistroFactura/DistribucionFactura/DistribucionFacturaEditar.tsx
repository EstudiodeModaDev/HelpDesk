// src/components/DistribucionFactura/DistribucionFacturaEditar.tsx
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

  // 🧮 Estado local con los campos editables
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

  // 🔹 Función para actualizar campos del form
  const setField = <K extends keyof typeof formData>(k: K, v: typeof formData[K]) =>
    setFormData((s) => ({ ...s, [k]: v }));

  // ✅ Limpia los datos antes de enviarlos al servicio (evita undefined o NaN)
  const limpiarDatos = (obj: Record<string, any>) => {
    const limpio: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      if (v === "") limpio[k] = null;
      else if (typeof v === "number" && isNaN(v)) limpio[k] = 0;
      else limpio[k] = v;
    }
    return limpio;
  };

  // 🧾 Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!distribucion.Id) {
      console.error("❌ No se encontró Id del registro de distribución.");
      alert("No se puede actualizar: falta el Id del registro.");
      return;
    }

    try {
      // 🔹 1️⃣ Preparar los cambios de la distribución
      const cambiosDist = limpiarDatos({
        FechaEmision: formData.FechaEmision || null,
        NoFactura: formData.NoFactura,
        CargoFijo: Number(formData.CargoFijo),
        ImpBnCedi: Number(formData.ImpBnCedi),
        ImpBnPalms: Number(formData.ImpBnPalms),
        ImpColorPalms: Number(formData.ImpColorPalms),
        ImpBnCalle: Number(formData.ImpBnCalle),
        ImpColorCalle: Number(formData.ImpColorCalle),
      });

      console.log("📦 Enviando datos limpios a SharePoint:", cambiosDist);

      // 🔹 2️⃣ Actualizar la distribución principal
      await serviceDist.update(String(distribucion.Id), cambiosDist);
      console.log("✅ Distribución actualizada correctamente.");

      // 🔹 3️⃣ Buscar facturas relacionadas por IdDistribuida
      // 🔹 3️⃣ Buscar facturas relacionadas por IdDistribuida (que apunta al Id de la distribución actual)
        if (!distribucion.Id) {
        console.warn("⚠️ No hay Id de distribución para buscar facturas relacionadas.");
        } else {
        const filtro = `fields/IdDistrubuida eq ${distribucion.Id}`;

        const posiblesFacturas = await serviceFact.getAll({ filter: filtro });
        const facturasRelacionadas = posiblesFacturas.items || [];

       if (facturasRelacionadas.length > 0) {
            console.log(
                `📄 Se encontraron ${facturasRelacionadas.length} facturas con IdDistrubuida=${distribucion.Id}`
            );

            // 🔹 4️⃣ Armar cambios a aplicar a todas las facturas
            const cambiosFactura = limpiarDatos({
                FechaEmision: formData.FechaEmision || null,
                NoFactura: formData.NoFactura,
                CargoFijo: Number(formData.CargoFijo),
                ImpBnCedi: Number(formData.ImpBnCedi),
                ImpBnPalms: Number(formData.ImpBnPalms),
                ImpColorPalms: Number(formData.ImpColorPalms),
                ImpBnCalle: Number(formData.ImpBnCalle),
                ImpColorCalle: Number(formData.ImpColorCalle),
            });


          // 🔁 5️⃣ Actualizar cada factura
          for (const factura of facturasRelacionadas) {
            if (factura.id0 != null) {
              await serviceFact.update(String(factura.id0), cambiosFactura);
              console.log(`🧾 Factura ${factura.id0} actualizada.`);
            }
          }

          console.log(`✅ ${facturasRelacionadas.length} factura(s) actualizadas correctamente.`);
        } else {
          console.warn("⚠️ No se encontraron facturas relacionadas con ese IdDistribuida.");
        }
      }

      // 🔹 6️⃣ Finalizar
      onGuardar?.();
      onClose();
    } catch (err) {
      console.error("❌ Error al actualizar distribución o facturas:", err);
      alert("Error al actualizar la distribución. Revisa la consola para más detalles.");
    }
  };

  // 🗑️ Eliminar distribución
  const handleEliminar = async () => {
    if (!distribucion.Id) {
      alert("No se puede eliminar: falta el Id del registro.");
      return;
    }

    const confirmar = window.confirm("¿Seguro deseas eliminar el registro de distribución?");
    if (!confirmar) return;

    try {
      await serviceDist.delete(String(distribucion.Id));
      onEliminar?.(String(distribucion.Id));
      onClose();
    } catch (err) {
      console.error("❌ Error al eliminar distribución:", err);
      alert("Error al eliminar la distribución.");
    }
  };

  // 🧱 UI del modal
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
              onChange={(e) => setField("ImpColorPalms", Number(e.target.value))}
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
            <button type="submit" className="btn-guardar">✅ Guardar</button>
            <button type="button" className="btn-cancelar" onClick={onClose}>❌ Cancelar</button>
            <button type="button" className="btn-eliminar" onClick={handleEliminar}>🗑️ Eliminar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
