import { useEffect, useState } from "react";
import FacturaFiltros from "../FacturaFiltros/FacturaFiltros";
import FacturaEditar from "../FacturaEditar/FacturaEditar";
import { useFacturas } from "../../../Funcionalidades/RegistrarFactura";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";
import "./FacturasLista.css";

/**
 * 🧾 Componente que lista todas las facturas y permite filtrarlas o editarlas.
 */
export default function FacturasLista({ onVolver }: { onVolver: () => void }) {
  const { obtenerFacturas } = useFacturas();

  // 🧱 Estados base
  const [facturas, setFacturas] = useState<ReFactura[]>([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState<ReFactura[]>([]); // ✅ Lista filtrada
  const [facturaEdit, setFacturaEdit] = useState<ReFactura | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // 📦 Cargar las facturas al montar el componente
  useEffect(() => {
    const cargarFacturas = async () => {
      try {
        const lista = await obtenerFacturas();
        setFacturas(lista);
        setFacturasFiltradas(lista); // ✅ Inicialmente mostrar todas
      } catch (err) {
        console.error("Error al cargar facturas:", err);
      }
    };
    cargarFacturas();
  }, [obtenerFacturas]);

  // 🧹 Limpia el mensaje luego de 3 segundos
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  // 🗓️ Formatea la fecha
  const formatearFecha = (fecha?: string) => {
    if (!fecha) return "";
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /**
   * 🧠 Nueva función que recibe los filtros desde FacturaFiltros
   * y filtra la lista local sin recargar desde el servidor.
   */
  const aplicarFiltros = (filtros: Partial<ReFactura>) => {
    const filtradas = facturas.filter((f) => {
      // 📅 Filtrar por fecha si existe
      const coincideFecha = filtros.FechaEmision
        ? f.FechaEmision?.slice(0, 10) === filtros.FechaEmision
        : true;

      // 🔢 Número de factura
      const coincideNumero = filtros.NoFactura
        ? f.NoFactura?.toLowerCase().includes(filtros.NoFactura.toLowerCase())
        : true;

      // 🏢 Proveedor
      const coincideProveedor = filtros.Proveedor
        ? f.Proveedor?.toLowerCase().includes(filtros.Proveedor.toLowerCase())
        : true;

      // 🧾 NIT
      const coincideNIT = filtros.Title
        ? f.Title?.toLowerCase().includes(filtros.Title.toLowerCase())
        : true;

      // 💡 Ítem
      const coincideItem = filtros.Items
        ? f.Items === filtros.Items
        : true;

      return coincideFecha && coincideNumero && coincideProveedor && coincideNIT && coincideItem;
    });

    setFacturasFiltradas(filtradas);
  };

  return (
    <div className="facturas-lista">
      {/* 🔔 Notificación visual */}
      {mensaje && <div className="notificacion">{mensaje}</div>}

      {/* 🔎 Filtros de búsqueda (se envía la función aplicarFiltros) */}
      <FacturaFiltros onFiltrar={aplicarFiltros} />

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
              <th>Valor</th>
              <th>Items</th>
              <th>CC</th>
              <th>CO</th>
              <th>UN</th>
              <th>FechaCont</th>
              <th>DocERP</th>
              <th>Obs</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturasFiltradas.length > 0 ? (
              facturasFiltradas.map((factura, index) => (
                <tr key={factura.id0 || index}>
                  <td>{index + 1}</td>
                  <td>{formatearFecha(factura.FechaEmision)}</td>
                  <td>{factura.NoFactura}</td>
                  <td>{factura.Proveedor}</td>
                  <td>{factura.Title}</td>
                  <td>
                    {factura.ValorAnIVA.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td>{factura.Items}</td>
                  <td>{factura.CC}</td>
                  <td>{factura.CO}</td>
                  <td>{factura.un}</td>
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
                <td colSpan={11} style={{ textAlign: "center", padding: "1rem" }}>
                  No hay facturas que coincidan con los filtros.
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
          onEliminar={(idEliminado) => {
            setFacturas((prev) => prev.filter((f) => f.id0 !== idEliminado));
            setFacturasFiltradas((prev) => prev.filter((f) => f.id0 !== idEliminado)); // ✅ Mantener filtro
            setMensaje("🗑️ Factura eliminada correctamente");
            setTimeout(() => setFacturaEdit(null), 100);
          }}
          onGuardar={async () => {
            try {
              const lista = await obtenerFacturas();
              setFacturas(lista);
              setFacturasFiltradas(lista); // ✅ Refrescar lista filtrada
              setMensaje("✅ Factura actualizada correctamente");
              setTimeout(() => setFacturaEdit(null), 100);
            } catch (err) {
              console.error("Error al refrescar lista tras editar:", err);
            }
          }}
        />
      )}
    </div>
  );
}
