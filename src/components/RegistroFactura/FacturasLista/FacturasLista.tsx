// src/components/RegistrarFactura/FacturasLista/FacturasLista.tsx
import { useEffect, useState } from "react";
import FacturaFiltros from "../FacturaFiltros/FacturaFiltros";
import FacturaEditar from "../FacturaEditar/FacturaEditar";
import { useFacturas } from "../../../Funcionalidades/RegistrarFactura";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";
import "./FacturasLista.css"


/**
 * 🧾 Componente que lista todas las facturas y permite filtrarlas o editarlas.
 *
 * - Usa `useFacturas()` para obtener la lista desde SharePoint.
 * - Muestra los filtros de búsqueda (ahora internos en FacturaFiltros).
 * - Permite editar facturas existentes.
 */
export default function FacturasLista({ onVolver }: { onVolver: () => void }) {
  const { obtenerFacturas } = useFacturas();
  const [facturas, setFacturas] = useState<ReFactura[]>([]);
  const [facturaEdit, setFacturaEdit] = useState<ReFactura | null>(null);

  /**
   * 📦 Cargar las facturas al montar el componente
   */
  useEffect(() => {
    const cargarFacturas = async () => {
      try {
        const lista = await obtenerFacturas();
        setFacturas(lista);
      } catch (err) {
        console.error("Error al cargar facturas:", err);
      }
    };
    cargarFacturas();
  }, [obtenerFacturas]);

  /**
   * 🗓️ Formatea la fecha en formato local colombiano
   */
  const formatearFecha = (fecha?: string) => {
    if (!fecha) return "";
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="facturas-lista">
      {/* 🔎 Filtros de búsqueda */}
      <FacturaFiltros />

      {/* 📋 Tabla de facturas */}
      <div className="tabla-scroll">
        <table className="tabla-facturas">
          <thead>
            <tr>
              <th>Num</th>
              <th>FechaEmi</th>
              <th>N°Fac</th>
              <th>Proveedor</th>
              <th>NIT</th>
              <th>Item</th>
              <th>Valor</th>
              <th>FechaCont</th>
              <th>Item</th>
              <th>DocERP</th>
              <th>Obs</th>
            </tr>
          </thead>
          <tbody>
            {facturas.length > 0 ? (
              facturas.map((factura, index) => (
                <tr key={factura.id0 || index}>
                  <td>{index + 1}</td>
                  <td>{formatearFecha(factura.FechaEmision)}</td>
                  <td>{factura.NoFactura}</td>
                  <td>{factura.Proveedor}</td>
                  <td>{factura.Title}</td>
                  <td>{factura.Items}</td>
                  <td>
                    {factura.ValorAnIVA.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td>{formatearFecha(factura.FecEntregaCont)}</td>
                  <td>{factura.DocERP}</td>
                  <td>{factura.Observaciones}</td>
                  <td>
                    <button
                      className="btn-editar"
                      title="Editar factura"
                      onClick={() => setFacturaEdit(factura)}
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "1rem" }}>
                  No hay facturas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔽 Botón para volver al registro */}
      <button className="btn-volver-fijo" onClick={onVolver}>
        🔽 Registrar factura
      </button>

      {/* 🧰 Modal o panel de edición */}
{facturaEdit && (
  <FacturaEditar
    factura={facturaEdit}
    onClose={() => setFacturaEdit(null)}

    // 🆕 Cuando se elimina una factura, la quitamos de la lista local
    onEliminar={(idEliminado) => {
      setFacturas((prev) => prev.filter((f) => f.id0 !== idEliminado));
      setFacturaEdit(null);
    }}

    // 🆕 Cuando se guarda una factura editada, recargamos la lista completa
    onGuardar={async () => {
      try {
        const lista = await obtenerFacturas(); // 🔄 vuelve a traer las facturas del SharePoint
        setFacturas(lista);
        setFacturaEdit(null);
      } catch (err) {
        console.error("Error al refrescar lista tras editar:", err);
      }
    }}
  />
)}


    </div>
  );
}
