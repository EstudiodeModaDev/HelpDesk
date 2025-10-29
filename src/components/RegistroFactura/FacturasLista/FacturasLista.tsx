// src/components/Facturas/FacturasLista/FacturasLista.tsx
import { useEffect, useState } from "react";
import FacturaFiltros from "../FacturaFiltros/FacturaFiltros";
import FacturaEditar from "../FacturaEditar/FacturaEditar";
import FacturaDistribuidaModal from "../DistribucionFactura/FacturaDistribuidaModal";
import { useFacturas } from "../../../Funcionalidades/RegistrarFactura";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";
import type { DistribucionFacturaData } from "../../../Models/DistribucionFactura";
import "./FacturasLista.css";
import { truncateNoCutGraphemes } from "../../../utils/Commons";

export default function FacturasLista({ onVolver }: { onVolver: () => void }) {
  const { obtenerFacturas } = useFacturas();

  const [facturas, setFacturas] = useState<ReFactura[]>([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState<ReFactura[]>([]);
  const [facturaEdit, setFacturaEdit] = useState<ReFactura | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Modal de distribución
  const [modalDistribucion, setModalDistribucion] = useState<{
    visible: boolean;
    facturaDistribuida: DistribucionFacturaData | null;
  }>({ visible: false, facturaDistribuida: null });

  // Cargar facturas al iniciar
  useEffect(() => {
    const cargarFacturas = async () => {
      try {
        const lista = await obtenerFacturas();
        setFacturas(lista);
        setFacturasFiltradas(lista);
      } catch (err) {
        console.error("Error al cargar facturas:", err);
      }
    };
    cargarFacturas();
  }, [obtenerFacturas]);

  // Mensaje temporal
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const formatearFecha = (fecha?: string) => {
    if (!fecha) return "";
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // --- 🔎 Filtros ---
  const aplicarFiltros = (filtros: Partial<ReFactura>) => {
    const filtradas = facturas.filter((f) => {
      const coincideFecha = filtros.FechaEmision
        ? f.FechaEmision?.slice(0, 10) === filtros.FechaEmision
        : true;

      const coincideFechaEnt = filtros.FecEntregaCont
        ? f.FecEntregaCont?.slice(0, 10) === filtros.FecEntregaCont
        : true;

      const coincideNumero = filtros.NoFactura
        ? f.NoFactura?.toLowerCase().includes(filtros.NoFactura.toLowerCase())
        : true;

      const coincideProveedor = filtros.Proveedor
        ? f.Proveedor?.toLowerCase().includes(filtros.Proveedor.toLowerCase())
        : true;

      const coincideNIT = filtros.Title
        ? f.Title?.toLowerCase().includes(filtros.Title.toLowerCase())
        : true;

      const coincideItem = filtros.Items ? f.Items === filtros.Items : true;
      const coincidecc = filtros.CC ? f.CC === filtros.CC : true;
      const coincideco = filtros.CO ? f.CO === filtros.CO : true;
      const coincideun = filtros.un ? f.un === filtros.un : true;

      const coincideERP = filtros.DocERP
        ? f.DocERP?.toLowerCase().includes(filtros.DocERP.toLowerCase())
        : true;

      return (
        coincideFecha &&
        coincideNumero &&
        coincideProveedor &&
        coincideNIT &&
        coincideItem &&
        coincideFechaEnt &&
        coincidecc &&
        coincideco &&
        coincideun &&
        coincideERP
      );
    });

    setFacturasFiltradas(filtradas);
  };

  // --- 🔹 Función para saber si es la primera factura del grupo distribuido ---
  const esPrimeraDistribuida = (factura: ReFactura) => {
    if (!factura.IdDistribuida) return false;
    const grupo = facturasFiltradas.filter(
      (f) => f.IdDistribuida === factura.IdDistribuida
    );
    if (grupo.length === 0) return false;

    const primera = grupo.sort(
      (a, b) =>
        new Date(a.FechaEmision ?? "").getTime() -
        new Date(b.FechaEmision ?? "").getTime()
    )[0];

    return factura.id0 === primera.id0;
  };

  // --- 🔹 Conversor ReFactura → DistribucionFacturaData ---
  const convertirADistribucion = (
    factura: ReFactura
  ): DistribucionFacturaData => ({
    Id: factura.id0 ? factura.id0.toString() : "",
    Proveedor: factura.Proveedor ?? "",
    Title: factura.Title ?? "",
    ValorAnIVA: factura.ValorAnIVA ?? 0,
    FechaEmision: factura.FechaEmision ?? "",
    NoFactura: factura.NoFactura ?? "",
    Items: factura.Items ?? "",
    DescripItems: factura.DescripItems ?? "",
    CO: factura.CO ?? "",
    un: factura.un ?? "",
    DetalleFac: factura.DetalleFac ?? "",
    IdDistribuida: factura.IdDistribuida ?? "",

    // Campos faltantes con valores por defecto
    CargoFijo: 0,
    CosToImp: 0,
    ImpBnCedi: 0,
    ImpBnPalms: 0,
    ImpColorPalms: 0,
    ImpBnCalle: 0,
    ImpColorCalle: 0,
    CosTotMarNacionales: 0,
    CosTotMarImpor: 0,
    CosTotCEDI: 0,
    CosTotServAdmin: 0,
    CCmn: "",
    CCmi: "",
    CCcedi: "",
    CCsa: "",
  });

  return (
    <div className="facturas-lista">
      {mensaje && <div className="notificacion">{mensaje}</div>}

      <FacturaFiltros onFiltrar={aplicarFiltros} />

      <div className="tabla-scroll">
        <table className="tabla-facturas">
          <thead>
            <tr>
              <th>ID</th>
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
              <th>Detalle</th>
              <th>Obser</th>
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
                  <td>{formatearFecha(factura.FecEntregaCont ?? "")}</td>
                  <td>{factura.DocERP}</td>
                  <td
                    className="one-line-ellipsis"
                    title={factura.DetalleFac}
                  >
                    {truncateNoCutGraphemes(factura.DetalleFac ?? "", 20)}
                  </td>
                  <td
                    className="one-line-ellipsis"
                    title={factura.Observaciones}
                  >
                    {truncateNoCutGraphemes(factura.Observaciones ?? "", 20)}
                  </td>
                  <td>
                    <button
                      className="btn-editar"
                      title="Editar factura"
                      onClick={() => setFacturaEdit(factura)}
                    >
                      ✏️
                    </button>

                    {/* 📊 Mostrar solo en la primera del grupo distribuido */}
                    {factura.IdDistribuida && esPrimeraDistribuida(factura) && (
                      <button
                        className="btn-ver-distribucion"
                        title="Ver distribución"
                        onClick={() =>
                          setModalDistribucion({
                            visible: true,
                            facturaDistribuida: convertirADistribucion(factura),
                          })
                        }
                      >
                        📊
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={15} style={{ textAlign: "center", padding: "1rem" }}>
                  No hay facturas que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="btn-volver-fijo" onClick={onVolver}>
        🔽 Registrar factura
      </button>

      {/* 🧾 Modal de factura distribuida */}
      {modalDistribucion.visible && modalDistribucion.facturaDistribuida && (
        <FacturaDistribuidaModal
          factura={modalDistribucion.facturaDistribuida}
          onClose={() =>
            setModalDistribucion({ visible: false, facturaDistribuida: null })
          }
        />
      )}

      {/* ✏️ Modal de edición */}
      {facturaEdit && (
        <FacturaEditar
          factura={facturaEdit}
          onClose={() => setFacturaEdit(null)}
          onEliminar={(idEliminado) => {
            setFacturas((prev) => prev.filter((f) => f.id0 !== idEliminado));
            setFacturasFiltradas((prev) =>
              prev.filter((f) => f.id0 !== idEliminado)
            );
            setMensaje("🗑️ Factura eliminada correctamente");
          }}
          onGuardar={async () => {
            try {
              const lista = await obtenerFacturas();
              setFacturas(lista);
              setFacturasFiltradas(lista);
              setMensaje("✅ Factura actualizada correctamente");
            } catch (err) {
              console.error("Error al refrescar lista tras editar:", err);
            }
          }}
        />
      )}
    </div>
  );
}
