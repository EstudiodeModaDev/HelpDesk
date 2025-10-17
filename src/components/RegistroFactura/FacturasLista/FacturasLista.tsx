import React, { useEffect, useState } from "react";
import FacturaFiltros from "../FacturaFiltros/FacturaFiltros";
import FacturaEditar from "../FacturaEditar/FacturaEditar";
import { useFacturas } from "../../../Funcionalidades/RegistrarFactura";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";

/**
 * 🧾 Componente que lista todas las facturas y permite filtrarlas o editarlas.
 *
 * - Usa `useFacturas()` para obtener la lista desde SharePoint.
 * - Permite aplicar filtros básicos (fecha, número, proveedor, tipo...).
 * - Al hacer clic en ✏️, se abre el componente `FacturaEditar` para modificar.
 * - Tiene un botón para volver al formulario de registro principal.
 */
export default function FacturasLista({
  onVolver,
  filtrosExternos, // ✅ NUEVO: filtros que vienen desde RegistroFactura (opcional)
}: {
  onVolver: () => void;
  filtrosExternos?: Partial<ReFactura>;
}) {
  const { obtenerFacturas } = useFacturas(); // solo lectura
  const [facturas, setFacturas] = useState<ReFactura[]>([]);
  const [facturaEdit, setFacturaEdit] = useState<ReFactura | null>(null);

  // 🧠 Estado local de filtros
  // Si vienen filtros desde RegistroFactura, los toma como iniciales
  const [filtros, setFiltros] = useState({
    fechadeemision: filtrosExternos?.fechadeemision || "",
    numerofactura: filtrosExternos?.numerofactura || "",
    proveedor: filtrosExternos?.proveedor || "",
    Title: filtrosExternos?.Title || "",
    tipodefactura: filtrosExternos?.tipodefactura || "",
  });

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
   * 🎯 Actualiza los filtros cuando el usuario escribe en un input o select
   */
  const handleFiltroChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * 🔍 Filtra las facturas según los criterios introducidos
   * Este filtro combina tanto los filtros internos como los externos
   */
  const facturasFiltradas = facturas.filter((f) => {
    const filtrosCombinados = { ...filtros, ...filtrosExternos };
    return Object.entries(filtrosCombinados).every(([key, val]) =>
      val
        ? String((f as any)[key]).toLowerCase().includes(String(val).toLowerCase())
        : true
    );
  });

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
      {/* ✅ Si los filtros se controlan desde el padre, igual se renderizan aquí */}
      <FacturaFiltros filtros={filtros} onChange={handleFiltroChange} />

      {/* 📋 Tabla de facturas */}
      <div className="tabla-scroll">
        <table className="tabla-facturas">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Número</th>
              <th>Proveedor</th>
              <th>NIT</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturasFiltradas.length > 0 ? (
              facturasFiltradas.map((factura, index) => (
                <tr key={factura.id0 || index}>
                  <td>{index + 1}</td>
                  <td>{formatearFecha(factura.fechadeemision)}</td>
                  <td>{factura.numerofactura}</td>
                  <td>{factura.proveedor}</td>
                  <td>{factura.Title}</td>
                  <td>{factura.tipodefactura}</td>
                  <td>
                    {factura.valor.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    })}
                  </td>
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
        />
      )}
    </div>
  );
}
